import { dayAt } from './curriculum'
import { isStarred, mustVerse, verses } from './data'
import type { AppData, Verse } from './types'

/**
 * 짝 맞추기 — `장절`과 `첫 소절` 타일을 맞추면 사라지는 게임 (design.md §6.3).
 * 암송 세션이 아니라 연결 워밍업이라 기록은 최고 점수뿐이고 부채·seen을 건드리지 않는다.
 */

/** 한 보드의 짝 수 (타일 2배) */
export const PAIRS = 5

export type PairPool = 'today' | 'starred' | 'all'

export type Tile = {
	key: string // 같은 구절의 두 타일을 구분 (verseId + kind)
	verseId: string
	kind: 'ref' | 'head'
	label: string
}

/**
 * 첫 소절 = 3~5어절. **짧으면 5어절, 길면 3어절** — 어절 수가 아니라 글자 수로
 * 끊어야 타일 크기가 고르다 ("또 증거는 이것이니 하나님이" vs "주께서 말씀하시기를").
 */
const HEAD_CHARS = 12

export function headPhrase(text: string): string {
	const words = text.split(/\s+/).filter(Boolean)
	const take: string[] = []
	for (const w of words) {
		take.push(w)
		if (take.length >= 5) break
		if (take.length >= 3 && take.join('').length >= HEAD_CHARS) break
	}
	return take.join(' ')
}

/** 게임이 뽑을 후보 구절 (풀이 5개 미만이면 보드가 그만큼 작아진다) */
export function poolVerses(pool: PairPool, data: AppData): Verse[] {
	if (pool === 'starred') return verses.filter((v) => isStarred(data.stars, v))
	if (pool === 'today') {
		const ids = new Set(dayAt(data.daily.order[0] ?? 0).ids)
		return verses.filter((v) => ids.has(v.id))
	}
	return verses
}

export const poolLabel: Record<PairPool, string> = {
	today: '오늘 진도',
	starred: '별표',
	all: '전체',
}

function shuffle<T>(items: T[]): T[] {
	const a = [...items]
	for (let i = a.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1))
		;[a[i], a[j]] = [a[j] as T, a[i] as T]
	}
	return a
}

/**
 * 덱에서 한 보드를 뜬다. **같은 보드에 장절이나 첫 소절이 겹치는 구절은 넣지 않는다** —
 * 장절이 같은 별개 카드(ADR-6)가 함께 깔리면 어느 짝이 맞는지 알 길이 없다.
 * 남은 덱을 함께 돌려주고, 덱이 모자라면 호출자가 다시 섞는다.
 */
export function dealBoard(
	deck: string[],
	size = PAIRS,
): { tiles: Tile[]; rest: string[] } {
	const picked: string[] = []
	const rest: string[] = []
	const refs = new Set<string>()
	const heads = new Set<string>()
	for (const id of deck) {
		const v = mustVerse(id)
		const head = headPhrase(v.text)
		if (picked.length >= size || refs.has(v.ref) || heads.has(head)) {
			rest.push(id)
			continue
		}
		picked.push(id)
		refs.add(v.ref)
		heads.add(head)
	}
	const tiles = picked.flatMap((id): Tile[] => {
		const v = mustVerse(id)
		return [
			{ key: `${id}:ref`, verseId: id, kind: 'ref', label: v.ref },
			{
				key: `${id}:head`,
				verseId: id,
				kind: 'head',
				label: headPhrase(v.text),
			},
		]
	})
	return { tiles: shuffle(tiles), rest }
}

/** 덱이 보드 하나를 채우지 못하면 풀 전체를 다시 섞어 이어 붙인다 (무한 스테이지) */
export function refill(deck: string[], pool: string[], size = PAIRS): string[] {
	if (deck.length >= size) return deck
	return [...deck, ...shuffle(pool)]
}

/** 짝을 맞출 때마다 콤보 배수 (5배에서 멈춘다 — 한 보드에서 다 맞추면 x5) */
export function matchScore(combo: number): number {
	return 100 * Math.min(combo, 5)
}

/** 보드 클리어 보너스 — 한 번도 안 틀렸으면 두 배 */
export function clearBonus(missesInBoard: number): number {
	return missesInBoard === 0 ? 1000 : 500
}
