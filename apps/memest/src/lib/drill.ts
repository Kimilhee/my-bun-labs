import type { Stats } from './types'

/**
 * 하드드릴 점수(부채) — Leitner와 완전히 독립.
 * 카드는 0에서 시작하고, 0 미만인 동안 세션 안에서 계속 재등장한다.
 * 부채를 갚는 길은 무결점 정답(힌트 0 + 정답)뿐이다.
 */

/** 부채 하한 — 최악이어도 무결점 3회면 졸업할 수 있게 */
export const DRILL_FLOOR = -24

/** 무결점 정답 / 힌트 누적 감점(1겹 -1, 2겹 -2, 3겹 -4) */
const CORRECT = [10, -1, -3, -7]

/**
 * 회차 점수. 오답이면 힌트 감점을 합산하지 않고 확정값을 쓴다 —
 * 합산하면 "힌트 쓰고 틀리기"가 "그냥 포기"보다 나빠져 힌트를 회피하게 된다.
 */
export function turnScore(hints: number, wrong: boolean): number {
	if (wrong) return hints === 0 ? -10 : -12
	return CORRECT[Math.min(hints, CORRECT.length - 1)] ?? -7
}

/** 더블탭으로 어절 하나를 열어보는 비용 (첫머리 커닝도 공짜가 아니다) */
export const REVEAL_COST = -3

/** 이번 회차에 연 어절 수만큼의 감점 */
export function revealPenalty(revealedWords: number): number {
	return REVEAL_COST * revealedWords
}

/** 부채가 깊을수록 짧은 간격으로 되돌아온다 (부채가 줄면 간격이 벌어짐) */
export function requeueGap(score: number): number {
	if (score <= -20) return 1
	if (score <= -10) return 3
	return 8
}

/** 큐의 gap번째 뒤에 삽입. 큐가 짧으면 맨 뒤가 된다. */
export function insertAt(queue: string[], id: string, gap: number): string[] {
	const i = Math.min(gap, queue.length)
	return [...queue.slice(0, i), id, ...queue.slice(i)]
}

/** 틀렸거나 힌트를 쓴 회차만 기록 (모드 무관, 재등장 회차도 각각 집계) */
export function bumpStats(
	stats: Record<string, Stats>,
	id: string,
	hints: number,
	wrong: boolean,
): Record<string, Stats> {
	if (!wrong && hints === 0) return stats
	const prev = stats[id] ?? { wrong: 0, hints: 0 }
	return {
		...stats,
		[id]: { wrong: prev.wrong + (wrong ? 1 : 0), hints: prev.hints + hints },
	}
}
