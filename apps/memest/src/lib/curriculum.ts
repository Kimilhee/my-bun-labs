import { parts, verses } from './data'
import type { ReviewOrder } from './types'

/**
 * 매일 복습의 진도표 — 목차 순서를 하루치로 잘라 놓은 고정 목록.
 * 하루치의 기본 단위는 중제목(없으면 파트 전체)이고, 목표 12구절에 맞춰
 * 짧은 단위는 이어 붙이고(상한 16) 긴 단위는 균등하게 나눈다.
 * 끝까지 가면 처음으로 돌아가는 무한 순환이다.
 */
const TARGET = 12
const MAX = 16

export type DayChunk = { title: string; ids: string[] }

type Unit = { part: string; name: string | null; ids: string[] }

/** `파트 › 중제목 + 중제목` 꼴로, 파트가 바뀌면 ` + `로 잇는다 */
function titleOf(units: Unit[], piece?: string): string {
	const runs: string[] = []
	let curPart = ''
	let mids: string[] = []
	const flush = () => {
		if (!curPart) return
		runs.push(mids.length ? `${curPart} › ${mids.join(' + ')}` : curPart)
		mids = []
	}
	for (const u of units) {
		if (u.part !== curPart) {
			flush()
			curPart = u.part
		}
		if (u.name) mids.push(u.name)
	}
	flush()
	return runs.join(' + ') + (piece ? ` (${piece})` : '')
}

function build(): DayChunk[] {
	const units: Unit[] = []
	for (const p of parts) {
		const vs = verses.filter((v) => v.part === p.part)
		if (p.midTitles.length === 0)
			units.push({ part: p.part, name: null, ids: vs.map((v) => v.id) })
		else
			for (const mid of p.midTitles)
				units.push({
					part: p.part,
					name: mid,
					ids: vs.filter((v) => v.midTitle === mid).map((v) => v.id),
				})
	}

	const days: DayChunk[] = []
	let buf: Unit[] = []
	const size = (us: Unit[]) => us.reduce((a, u) => a + u.ids.length, 0)
	const flush = () => {
		if (buf.length === 0) return
		days.push({ title: titleOf(buf), ids: buf.flatMap((u) => u.ids) })
		buf = []
	}
	for (const u of units) {
		if (u.ids.length > MAX) {
			// 긴 단위는 단독으로 균등 분할 (27구절 → 9·9·9)
			flush()
			const n = Math.ceil(u.ids.length / TARGET)
			const each = Math.ceil(u.ids.length / n)
			for (let i = 0; i < n; i++)
				days.push({
					title: titleOf([u], `${i + 1}/${n}`),
					ids: u.ids.slice(i * each, (i + 1) * each),
				})
			continue
		}
		if (size(buf) + u.ids.length > MAX) flush()
		buf.push(u)
	}
	flush()
	return days
}

export const days: DayChunk[] = build()

export const dayAt = (i: number): DayChunk =>
	days[((i % days.length) + days.length) % days.length] as DayChunk

/** 한 바퀴 전체 (진도표 인덱스 0..N-1) */
export const fullLap = () => days.map((_, i) => i)

/**
 * 남은 묶음(진도표 인덱스)을 순서 설정대로 줄 세운다.
 * 정순·역순은 **인덱스 기준 정렬**이라 이미 섞인 상태에서 바꿔도 제자리를 찾는다.
 */
export function orderDays(indices: number[], order: ReviewOrder): number[] {
	if (order === 'shuffle') return ordered(indices, 'shuffle')
	const a = [...indices].sort((x, y) => x - y)
	return order === 'backward' ? a.reverse() : a
}

/** 목차 순서로 들어온 항목을 순서 설정대로 (하루치 안의 구절 차례) */
export function ordered<T>(items: T[], order: ReviewOrder): T[] {
	const a = [...items]
	if (order === 'backward') return a.reverse()
	if (order === 'shuffle') {
		for (let i = a.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1))
			;[a[i], a[j]] = [a[j] as T, a[i] as T]
		}
	}
	return a
}

const iso = (d: Date) =>
	`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

/** 오늘 날짜 (진도의 "오늘 분량 끝" 판정용) */
export const todayStr = () => iso(new Date())
