import { isStarred, mustVerse, verses } from './data'
import { inScope } from './session'
import type { AppData, PairGame } from './types'

/**
 * 짝 맞추기 — 왼쪽 `장절` 열과 오른쪽 `첫 소절` 열을 짝지어 지우는 게임 (ADR-22).
 * 범위를 직접 골라 그 범위를 다 지우면 끝이고, 진행은 저장되어 이어할 수 있다.
 * 암송 세션이 아니므로 `seen`·`stats`·하드드릴 부채를 건드리지 않는다.
 */

/** 한쪽 열의 슬롯 수 (= 동시에 깔리는 쌍의 최대치) */
export const SLOTS = 5

/**
 * 이 나이(보드에서 지나간 턴 수)부터 **회색 + 매 턴 −1점 + 맞출 때 복습 확인**.
 * 5쌍을 5턴에 다 지우는 퍼펙트 런에서는 아무 카드도 여기 도달하지 않는다.
 */
export const STALE_AGE = 5

const MATCH = 10 // 짝 점수 (콤보 배수 적용)
const MISS = -5 // 틀린 시도
/** 콤보 상한 3 — 노화 감점(−1/턴)이 보상에 묻히지 않게 낮게 잡았다 */
const COMBO_CAP = 3
const STALE_COST = -1 // 오래 남은 카드 하나가 한 턴에 까먹는 점수

/** 첫 소절 = 3~5어절. 글자 수로 끊어야 타일 크기가 고르다 (ADR-22) */
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

function shuffle<T>(items: T[]): T[] {
	const a = [...items]
	for (let i = a.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1))
		;[a[i], a[j]] = [a[j] as T, a[i] as T]
	}
	return a
}

/** 기록 키 — 같은 범위를 다시 고르면 같은 기록에 쌓인다 */
export function scopeSig(scope: string[] | null, starredOnly: boolean): string {
	return `${scope === null ? '*' : [...scope].sort().join('|')}${starredOnly ? '+★' : ''}`
}

/** 보드에 올라와 있는 카드들 (빈 자리 제외) */
export const onBoard = (g: PairGame): string[] =>
	g.refs.filter((id): id is string => id !== null)

/** 카드 나이 = 보드에 있는 동안 지나간 턴 수 */
export const ageOf = (g: PairGame, id: string): number =>
	g.turn - (g.born[id] ?? g.turn)

export const isStale = (g: PairGame, id: string): boolean =>
	ageOf(g, id) >= STALE_AGE

export const isFinished = (g: PairGame): boolean =>
	g.deck.length === 0 && g.review === null && onBoard(g).length === 0

/**
 * 보드에 넣을 수 있는 카드를 앞에서부터 고른다. **장절이나 첫 소절이 이미 판에
 * 있는 것과 겹치는 카드는 건너뛴다** — 장절이 같은 별개 카드(ADR-6)가 함께 깔리면
 * 정답이 둘이 된다. 건너뛴 카드는 덱에 순서대로 남아 나중에 다시 걸린다.
 */
function take(
	deck: string[],
	busy: string[],
	n: number,
): { picked: string[]; deck: string[] } {
	const refs = new Set(busy.map((id) => mustVerse(id).ref))
	const heads = new Set(busy.map((id) => headPhrase(mustVerse(id).text)))
	const picked: string[] = []
	const rest: string[] = []
	for (const id of deck) {
		const v = mustVerse(id)
		const head = headPhrase(v.text)
		if (picked.length >= n || refs.has(v.ref) || heads.has(head)) {
			rest.push(id)
			continue
		}
		picked.push(id)
		refs.add(v.ref)
		heads.add(head)
	}
	return { picked, deck: rest }
}

/** 빈 자리에 무작위로 꽂는다 (두 열을 따로 섞으므로 같은 줄이 짝이 아니다) */
function fill(slots: (string | null)[], ids: string[]): (string | null)[] {
	const free = shuffle(slots.flatMap((s, i) => (s === null ? [i] : [])))
	const out = [...slots]
	ids.forEach((id, k) => {
		const slot = free[k]
		if (slot !== undefined) out[slot] = id
	})
	return out
}

/**
 * 같은 줄에 자기 짝이 놓이면 공짜 힌트가 된다 — 다른 자리와 맞바꿔 깬다.
 * 값이 전부 다른 카드 id이므로 비어 있지 않은 아무 자리와 바꿔도 새 충돌은 없다.
 */
function fixRows(
	refs: (string | null)[],
	heads: (string | null)[],
): (string | null)[] {
	const out = [...heads]
	refs.forEach((ref, i) => {
		if (ref === null || out[i] !== ref) return
		const j = out.findIndex((h, k) => k !== i && h !== null)
		if (j >= 0) [out[i], out[j]] = [out[j] as string, out[i] as string]
	})
	return out
}

/**
 * 빈 자리가 **2개 이상 모였을 때만** 새 카드를 넣는다 (한 장씩 채우면 새로 들어온
 * 장절·첫 소절 타일이 반드시 짝이라 몰라도 맞출 수 있다). 덱이 1장만 남았으면
 * 그 1장을 넣는다 — 덱이 마르는 시점이라 더 기다릴 이유가 없다.
 */
function settle(g: PairGame): PairGame {
	const free = g.refs.filter((s) => s === null).length
	if (free < 2 || g.deck.length === 0) return g
	const { picked, deck } = take(g.deck, onBoard(g), free)
	if (picked.length === 0) return g
	const born = { ...g.born }
	for (const id of picked) born[id] = g.turn
	const refs = fill(g.refs, picked)
	return {
		...g,
		deck,
		born,
		refs,
		heads: fixRows(refs, fill(g.heads, shuffle(picked))),
	}
}

export function newGame(
	scope: string[] | null,
	starredOnly: boolean,
	data: AppData,
): PairGame | null {
	const ids = shuffle(
		verses
			.filter(
				(v) =>
					inScope(v.id, scope) && (!starredOnly || isStarred(data.stars, v)),
			)
			.map((v) => v.id),
	)
	if (ids.length === 0) return null
	const empty: PairGame = {
		scope,
		starredOnly,
		total: ids.length,
		done: 0,
		deck: ids,
		refs: Array(Math.min(SLOTS, ids.length)).fill(null),
		heads: Array(Math.min(SLOTS, ids.length)).fill(null),
		born: {},
		turn: 0,
		score: 0,
		combo: 0,
		misses: 0,
		review: null,
	}
	// 첫 배분은 슬롯 전체를 한 번에 채운다 (settle의 "2개 모아서" 규칙과 무관)
	const { picked, deck } = take(empty.deck, [], empty.refs.length)
	const born: Record<string, number> = {}
	for (const id of picked) born[id] = 0
	const refs = fill(empty.refs, picked)
	return {
		...empty,
		deck,
		born,
		refs,
		heads: fixRows(refs, fill(empty.heads, shuffle(picked))),
	}
}

const without = (slots: (string | null)[], id: string) =>
	slots.map((s) => (s === id ? null : s))

/**
 * 한 턴 = 장절 타일 하나와 첫 소절 타일 하나를 고른 판정 (틀려도 턴은 흐른다).
 * 턴이 흐를 때마다 오래 남은 카드마다 −1점씩 깎인다.
 */
export function tryPair(g: PairGame, refId: string, headId: string): PairGame {
	if (g.review) return g
	const stale = onBoard(g).filter((id) => isStale(g, id)).length
	const hit = refId === headId
	const combo = hit ? Math.min(g.combo + 1, COMBO_CAP) : 0
	const turned: PairGame = {
		...g,
		turn: g.turn + 1,
		combo,
		score: g.score + stale * STALE_COST + (hit ? MATCH * combo : MISS),
		misses: g.misses + (hit ? 0 : 1),
	}
	if (!hit) return turned

	// 맞춘 카드는 판에서 빼되, 오래 남은 카드였다면 복습 확인을 한 겹 둔다
	const late = isStale(g, refId)
	const next: PairGame = {
		...turned,
		refs: without(turned.refs, refId),
		heads: without(turned.heads, refId),
		done: turned.done + 1,
		review: late ? { verseId: refId, ref: false, head: false } : null,
	}
	return late ? next : settle(next)
}

/** 복습 확인 단계에서 두 타일을 각각 한 번씩 누르면 완료 */
export function reviewTap(g: PairGame, kind: 'ref' | 'head'): PairGame {
	if (!g.review) return g
	const review = { ...g.review, [kind]: true }
	if (!review.ref || !review.head) return { ...g, review }
	return settle({ ...g, review: null })
}
