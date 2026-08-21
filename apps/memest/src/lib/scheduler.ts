import type { Progress, SessionMode } from './types'

/** Leitner 박스별 복습 간격(일) */
export const INTERVALS = [1, 2, 4, 8, 16, 32]

const iso = (d: Date) =>
	`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export const todayStr = () => iso(new Date())

export const addDays = (n: number) => {
	const d = new Date()
	d.setDate(d.getDate() + n)
	return iso(d)
}

const interval = (box: number) =>
	INTERVALS[Math.min(Math.max(box, 0), INTERVALS.length - 1)] ?? 1

/**
 * 힌트 사용량 = 채점 점수.
 * - 첫 만남(prev 없음) = 진단 배치
 * - 하드드릴은 비대칭 반영: 약함 신호만 강등, 성공은 간격 연장 없음
 *
 * 지금 이 값(box/due)으로 카드를 고르는 화면은 없다 — 나중에 due 기반 모드를
 * 붙일 수 있게 기록만 계속 쌓아둔다.
 */
export function grade(
	prev: Progress | undefined,
	hints: number,
	wrong: boolean,
	mode: SessionMode,
): Progress {
	if (!prev) {
		if (wrong) return { level: 'C', box: 0, streak: 0, due: addDays(1) }
		if (hints === 0)
			return { level: 'D', box: 3, streak: 0, due: addDays(interval(3)) }
		if (hints === 1)
			return { level: 'C', box: 2, streak: 0, due: addDays(interval(2)) }
		return { level: 'C', box: 1, streak: 0, due: addDays(interval(1)) }
	}
	if (wrong) return { level: 'C', box: 0, streak: 0, due: addDays(1) }
	if (hints >= 2)
		return {
			...prev,
			box: Math.max(prev.box - 1, 0),
			streak: 0,
			due: addDays(1),
		}
	if (mode === 'drill') return hints === 0 ? prev : { ...prev, streak: 0 }
	if (hints === 1)
		return {
			...prev,
			streak: 0,
			due: addDays(Math.ceil(interval(prev.box) / 2)),
		}
	// 매일 복습에서 힌트 0개 성공
	const streak = prev.streak + 1
	const promote = prev.level === 'C' && streak >= 2
	const box = Math.min(prev.box + 1, INTERVALS.length - 1)
	return {
		level: promote ? 'D' : prev.level,
		box,
		streak: promote ? 0 : streak,
		due: addDays(interval(box)),
	}
}
