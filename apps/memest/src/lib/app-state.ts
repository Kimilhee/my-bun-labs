import { grade } from './scheduler'
import { buildDailyQueue, buildIntensiveQueue } from './session'
import type { AppData, Session } from './types'

export const defaultData: AppData = {
	progress: {},
	settings: { dailySize: 20, scopeParts: null },
	session: null,
}

export type Action =
	| { type: 'startDaily' }
	| {
			type: 'startIntensive'
			codes: string[]
			starredOnly: boolean
			cap: number
	  }
	| { type: 'hint' }
	| { type: 'recalled' } // 떠올랐다 → 정답 확인으로
	| { type: 'reveal' } // 힌트 다 쓰고 정답 보기
	| { type: 'backToCue' } // 정답 확인 화면에서 다시 시도로 복귀 (정답 안 봤을 때만 UI 노출)
	| { type: 'next'; wrong: boolean }
	| { type: 'quitSession' }
	| { type: 'setDailySize'; size: number }
	| { type: 'setScopeParts'; codes: string[] | null }
	| { type: 'redoVerse'; verseId: string; showAnswer?: boolean } // 지나온 구절을 다시 현재 카드로 (showAnswer면 전문부터)
	| { type: 'importData'; data: AppData }
	| { type: 'resetProgress' }

const freshCard = {
	stage: 'cue' as const,
	hintsUsed: 0,
	revealed: false,
	peeked: false,
}

function newSession(
	mode: Session['mode'],
	queue: string[],
	scopeCodes: string[] | null,
): Session | null {
	if (queue.length === 0) return null
	return { mode, queue, history: [], scopeCodes, ...freshCard }
}

export function reduce(data: AppData, action: Action): AppData {
	const s = data.session
	switch (action.type) {
		case 'startDaily':
			return {
				...data,
				session: newSession('daily', buildDailyQueue(data), null),
			}
		case 'startIntensive':
			return {
				...data,
				session: newSession(
					'intensive',
					buildIntensiveQueue(action.codes, action.starredOnly, action.cap),
					action.codes,
				),
			}
		case 'hint':
			return s
				? { ...data, session: { ...s, hintsUsed: s.hintsUsed + 1 } }
				: data
		case 'recalled':
			return s
				? { ...data, session: { ...s, stage: 'answer', revealed: false } }
				: data
		case 'reveal':
			return s
				? { ...data, session: { ...s, stage: 'answer', revealed: true } }
				: data
		case 'backToCue':
			return s
				? { ...data, session: { ...s, stage: 'cue', revealed: false } }
				: data
		case 'next': {
			const id = s?.queue[0]
			if (!s || !id) return data
			const wrong = s.revealed || action.wrong
			// peeked = 전문 공개 상태로 열린 브라우징 회차 — 채점에서 제외
			const counted = !s.peeked && !s.history.some((e) => e.verseId === id)
			const progress = counted
				? {
						...data.progress,
						[id]: grade(data.progress[id], s.hintsUsed, wrong, s.mode),
					}
				: data.progress
			const rest = s.queue.slice(1)
			// 재큐잉: 집중 세션은 맨몸으로 열릴 때까지, 일일 세션은 정답 공개 시 1회만
			const requeue =
				!s.peeked &&
				(s.mode === 'intensive'
					? wrong || s.hintsUsed > 0
					: wrong && s.history.filter((e) => e.verseId === id).length === 0)
			const queue = requeue ? [...rest, id] : rest
			const history = [
				...s.history,
				{ verseId: id, hints: s.hintsUsed, wrong, counted },
			]
			const session: Session = {
				...s,
				queue,
				history,
				...freshCard,
				stage: queue.length === 0 ? 'done' : 'cue',
			}
			return { ...data, progress, session }
		}
		case 'quitSession':
			return { ...data, session: null }
		case 'setDailySize':
			return {
				...data,
				settings: { ...data.settings, dailySize: Math.max(1, action.size) },
			}
		case 'redoVerse': {
			if (!s || s.queue[0] === action.verseId) return data
			// 이미 채점된 카드의 재도전이면 history에 있으니 counted=false로 처리됨.
			// 대기 중이던 카드를 고르면 복제 대신 맨 앞으로 이동.
			return {
				...data,
				session: {
					...s,
					queue: [
						action.verseId,
						...s.queue.filter((q) => q !== action.verseId),
					],
					...freshCard,
					stage: action.showAnswer ? 'answer' : 'cue',
					peeked: Boolean(action.showAnswer),
				},
			}
		}
		case 'setScopeParts': {
			const next = {
				...data,
				settings: { ...data.settings, scopeParts: action.codes },
			}
			// 진행 중인 일일 세션은 새 범위로 즉시 재구성 (집중 세션은 유지)
			if (next.session?.mode === 'daily')
				next.session = newSession('daily', buildDailyQueue(next), null)
			return next
		}
		case 'importData':
			return action.data
		case 'resetProgress':
			return { ...data, progress: {}, session: null }
	}
}
