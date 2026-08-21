import { dayAt, fullLap, orderDays, ordered, todayStr } from './curriculum'
import { mustVerse } from './data'
import {
	bumpStats,
	DRILL_FLOOR,
	insertAt,
	requeueGap,
	revealPenalty,
	turnScore,
} from './drill'
import { buildDrillQueue } from './session'
import type { AppData, ReviewOrder, Session, SessionMode } from './types'

export const defaultData: AppData = {
	seen: {},
	drill: {},
	stars: {},
	stats: {},
	settings: {
		mode: 'daily',
		reviewOrder: 'forward',
		scopeParts: null,
		listFull: true,
	},
	daily: { order: fullLap(), doneDate: null },
	sessions: { daily: null, drill: null },
}

export type Action =
	| { type: 'setMode'; mode: SessionMode }
	| { type: 'startDaily' } // 오늘 진도 한 묶음
	| { type: 'startDrill'; scope: string[] | null; starredOnly: boolean }
	| { type: 'hint' }
	| { type: 'revealWord' } // 더블탭으로 다음 어절 열기 (하드드릴 감점)
	| { type: 'toggleStar'; verseId: string }
	| { type: 'recalled' } // 떠올랐다 → 정답 확인으로
	| { type: 'reveal' } // 힌트 다 쓰고 정답 보기
	| { type: 'backToCue' } // 정답 확인 화면에서 다시 시도로 복귀 (정답 안 봤을 때만 UI 노출)
	| { type: 'next'; wrong: boolean }
	| { type: 'quitSession' } // 지금 모드의 세션을 버린다
	| { type: 'setListFull'; on: boolean }
	| { type: 'setReviewOrder'; order: ReviewOrder }
	| { type: 'redoVerse'; verseId: string; showAnswer?: boolean } // 지나온 구절을 다시 현재 카드로 (showAnswer면 전문부터)
	| { type: 'importData'; data: AppData }
	| { type: 'resetProgress' }

const freshCard = {
	stage: 'cue' as const,
	hintsUsed: 0,
	revealed: false,
	peeked: false,
	revealedWords: 0,
}

function newSession(
	mode: SessionMode,
	queue: string[],
	scopeCodes: string[] | null,
): Session | null {
	if (queue.length === 0) return null
	return { mode, queue, history: [], scopeCodes, ...freshCard }
}

/** 지금 모드의 세션만 갈아끼운다 (다른 모드의 진행은 건드리지 않는다) */
function put(data: AppData, session: Session | null): AppData {
	return {
		...data,
		sessions: { ...data.sessions, [data.settings.mode]: session },
	}
}

export function reduce(data: AppData, action: Action): AppData {
	const mode = data.settings.mode
	const s = data.sessions[mode]
	switch (action.type) {
		case 'setMode':
			return { ...data, settings: { ...data.settings, mode: action.mode } }
		case 'startDaily': {
			// 오늘 분량 = 남은 큐의 맨 앞. 구절 차례도 같은 순서 설정을 따른다.
			const today = dayAt(data.daily.order[0] ?? 0)
			return {
				...data,
				settings: { ...data.settings, mode: 'daily' },
				sessions: {
					...data.sessions,
					daily: newSession(
						'daily',
						ordered(today.ids, data.settings.reviewOrder),
						null,
					),
				},
			}
		}
		case 'startDrill': {
			const queue = buildDrillQueue(action.scope, action.starredOnly, data)
			return {
				...data,
				settings: { ...data.settings, mode: 'drill', scopeParts: action.scope },
				sessions: {
					...data.sessions,
					drill: newSession('drill', queue, action.scope),
				},
			}
		}
		case 'hint':
			return s ? put(data, { ...s, hintsUsed: s.hintsUsed + 1 }) : data
		case 'revealWord':
			return s
				? put(data, { ...s, revealedWords: (s.revealedWords ?? 0) + 1 })
				: data
		case 'toggleStar': {
			const v = mustVerse(action.verseId)
			return {
				...data,
				stars: {
					...data.stars,
					[action.verseId]: !(data.stars[action.verseId] ?? v.starred),
				},
			}
		}
		case 'recalled':
			return s ? put(data, { ...s, stage: 'answer', revealed: false }) : data
		case 'reveal':
			return s ? put(data, { ...s, stage: 'answer', revealed: true }) : data
		case 'backToCue':
			return s ? put(data, { ...s, stage: 'cue', revealed: false }) : data
		case 'next': {
			const id = s?.queue[0]
			if (!s || !id) return data
			const wrong = s.revealed || action.wrong
			// peeked = 전문 공개 상태로 열린 브라우징 회차 — 채점·집계에서 전부 제외
			const scored = !s.peeked
			const counted = scored && !s.history.some((e) => e.verseId === id)
			// 리스트의 "다뤄본 구절" 판정에만 쓰는 흔적
			const seen = scored ? { ...data.seen, [id]: todayStr() } : data.seen
			const stats = scored
				? bumpStats(data.stats, id, s.hintsUsed, wrong)
				: data.stats
			const rest = s.queue.slice(1)

			let drill = data.drill
			let queue = rest
			if (s.mode === 'drill' && scored) {
				// 부채가 깊을수록 가까이 되돌아오고, 0 이상이 되면 졸업(항목 삭제)
				const score = Math.max(
					DRILL_FLOOR,
					(data.drill[id] ?? 0) +
						turnScore(s.hintsUsed, wrong) +
						revealPenalty(s.revealedWords ?? 0),
				)
				drill = { ...data.drill }
				if (score >= 0) delete drill[id]
				else {
					drill[id] = score
					queue = insertAt(rest, id, requeueGap(score))
				}
			} else if (s.mode === 'daily' && scored && wrong) {
				// 매일 복습은 점수를 매기지 않는다 — 틀린 구절만 맨 뒤로 보내 맞출 때까지
				queue = [...rest, id]
			}
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
			// 오늘 분량을 끝냈으면 큐에서 빼고 오늘 날짜를 찍는다 (다음 묶음은 내일).
			// 한 바퀴를 다 돌았으면 새 바퀴를 순서 설정대로 채운다.
			let daily = data.daily
			if (s.mode === 'daily' && queue.length === 0) {
				const rest = data.daily.order.slice(1)
				daily = {
					order: rest.length
						? rest
						: orderDays(fullLap(), data.settings.reviewOrder),
					doneDate: todayStr(),
				}
			}
			return { ...put(data, session), seen, drill, stats, daily }
		}
		case 'quitSession':
			return put(data, null)
		case 'setListFull':
			return {
				...data,
				settings: { ...data.settings, listFull: action.on },
			}
		case 'setReviewOrder':
			// 진행 중인 오늘 분량은 그대로 두고, 남은 묶음만 새 순서로 다시 세운다
			return {
				...data,
				settings: { ...data.settings, reviewOrder: action.order },
				daily: {
					...data.daily,
					order: orderDays(data.daily.order, action.order),
				},
			}
		case 'redoVerse': {
			if (!s || s.queue[0] === action.verseId) return data
			// 이미 채점된 카드의 재도전이면 history에 있으니 counted=false로 처리됨.
			// 대기 중이던 카드를 고르면 복제 대신 맨 앞으로 이동.
			return put(data, {
				...s,
				queue: [action.verseId, ...s.queue.filter((q) => q !== action.verseId)],
				...freshCard,
				stage: action.showAnswer ? 'answer' : 'cue',
				peeked: Boolean(action.showAnswer),
			})
		}
		case 'importData':
			return action.data
		case 'resetProgress':
			return {
				...data,
				seen: {},
				drill: {},
				stats: {},
				daily: {
					order: orderDays(fullLap(), data.settings.reviewOrder),
					doneDate: null,
				},
				sessions: { daily: null, drill: null },
			}
	}
}
