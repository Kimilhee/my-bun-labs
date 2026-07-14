import { grade } from './scheduler'
import { buildDailyQueue, buildIntensiveQueue } from './session'
import type { AppData, Session } from './types'

export const defaultData: AppData = {
	progress: {},
	settings: {
		dailySize: 20,
		firstPhraseMode: false,
		voiceRecitation: true,
		scopeParts: null,
		autoAdvance: true,
	},
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
	| { type: 'setFirstPhraseMode'; on: boolean }
	| { type: 'setVoiceRecitation'; on: boolean }
	| { type: 'setScopeParts'; codes: string[] | null }
	| { type: 'setAutoAdvance'; on: boolean }
	| { type: 'redoPrev' } // 직전에 지나간 구절을 다시 현재 카드로
	| { type: 'importData'; data: AppData }
	| { type: 'resetProgress' }

const freshCard = { stage: 'cue' as const, hintsUsed: 0, revealed: false }

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
			const counted = !s.history.some((e) => e.verseId === id)
			const progress = counted
				? {
						...data.progress,
						[id]: grade(data.progress[id], s.hintsUsed, wrong, s.mode),
					}
				: data.progress
			const rest = s.queue.slice(1)
			// 재큐잉: 집중 세션은 맨몸으로 열릴 때까지, 일일 세션은 정답 공개 시 1회만
			const requeue =
				s.mode === 'intensive'
					? wrong || s.hintsUsed > 0
					: wrong && s.history.filter((e) => e.verseId === id).length === 0
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
		case 'setFirstPhraseMode':
			return {
				...data,
				settings: { ...data.settings, firstPhraseMode: action.on },
			}
		case 'setVoiceRecitation':
			return {
				...data,
				settings: { ...data.settings, voiceRecitation: action.on },
			}
		case 'setAutoAdvance':
			return {
				...data,
				settings: { ...data.settings, autoAdvance: action.on },
			}
		case 'redoPrev': {
			if (!s) return data
			const cur = s.queue[0]
			const prev = [...s.history]
				.reverse()
				.find((e) => e.verseId !== cur)?.verseId
			if (!prev) return data
			// 이미 채점된 카드의 재도전이라 history에 있으니, 이번 회차는 counted=false로 처리됨
			return {
				...data,
				session: { ...s, queue: [prev, ...s.queue], ...freshCard },
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
