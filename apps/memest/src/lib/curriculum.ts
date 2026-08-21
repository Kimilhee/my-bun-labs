import { parts, verses } from './data'

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

/** 진도 포인터를 진도표 범위 안으로 감는다 (끝나면 처음으로) */
export const dayAt = (cursor: number): DayChunk => {
	const i = ((cursor % days.length) + days.length) % days.length
	return days[i] as DayChunk
}

export const dayNumber = (cursor: number) =>
	(((cursor % days.length) + days.length) % days.length) + 1
