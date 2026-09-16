import { defaultData } from './app-state'
import { fullLap, orderDays } from './curriculum'
import type { AppData, ReviewOrder, Session } from './types'

const KEY = 'memest:v1'

export function loadData(): AppData {
	try {
		const raw = localStorage.getItem(KEY)
		if (!raw) return defaultData
		const parsed = JSON.parse(raw) as Partial<AppData> & {
			session?: (Session & { mode: string }) | null // v0.2까지의 단일 세션
			progress?: Record<string, unknown> // v0.3.0까지의 Leitner 기록
			daily?: Partial<AppData['daily']> & { cursor?: number }
			settings?: Partial<AppData['settings']> & { dailyOrder?: ReviewOrder } // v0.3.1의 이름
		}
		const settings = {
			...defaultData.settings,
			...parsed.settings,
			reviewOrder:
				parsed.settings?.reviewOrder ??
				parsed.settings?.dailyOrder ??
				defaultData.settings.reviewOrder,
		}
		const sessions = parsed.sessions ?? migrateSession(parsed.session)
		return {
			// Leitner를 걷어내며 progress는 "본 적 있다"는 흔적만 남긴다
			seen: parsed.seen ?? migrateSeen(parsed.progress),
			drill: parsed.drill ?? {},
			stars: parsed.stars ?? {},
			stats: parsed.stats ?? {},
			settings,
			daily: {
				order: parsed.daily?.order?.length
					? parsed.daily.order
					: // v0.3.0의 cursor(몇 번째까지 했나) → 남은 묶음 큐
						orderDays(
							fullLap().filter((i) => i >= (parsed.daily?.cursor ?? 0)),
							settings.reviewOrder,
						),
				doneDate: parsed.daily?.doneDate ?? null,
			},
			sessions: {
				daily: sessions.daily ?? null,
				drill: sessions.drill ?? null,
			},
			// v0.4.2까지의 판(점수·콤보)에는 debt/streak이 없다 — 기본값으로 메운다
			pair: parsed.pair
				? {
						...parsed.pair,
						aged: parsed.pair.aged ?? {},
						debt: parsed.pair.debt ?? {},
						streak: parsed.pair.streak ?? 0,
						bestStreak: parsed.pair.bestStreak ?? 0,
						review: migrateReview(parsed.pair.review),
					}
				: null,
			// v0.4.0의 기록은 {score, stage}였다 — 모양이 다른 항목은 버린다
			pairBest: Object.fromEntries(
				Object.entries(parsed.pairBest ?? {}).filter(
					([, r]) => typeof (r as { turns?: unknown })?.turns === 'number',
				),
			),
		}
	} catch {
		return defaultData
	}
}

function migrateSeen(
	progress: Record<string, unknown> | undefined,
): Record<string, string> {
	if (!progress) return {}
	const out: Record<string, string> = {}
	for (const id of Object.keys(progress)) out[id] = ''
	return out
}

/** v0.2의 단일 세션(`session`)을 모드별 칸으로 옮긴다 — 집중 세션 = 하드드릴 */
function migrateSession(
	old: (Session & { mode: string }) | null | undefined,
): Partial<AppData['sessions']> {
	if (!old) return {}
	return old.mode === 'daily'
		? { daily: { ...old, mode: 'daily' } }
		: { drill: { ...old, mode: 'drill' } }
}

/** v0.4.5의 각인 단계는 {ref, head} 플래그였다 → step으로 환산 */
function migrateReview(old: unknown): { verseId: string; step: number } | null {
	if (!old || typeof old !== 'object') return null
	const r = old as {
		verseId?: string
		step?: number
		ref?: boolean
		head?: boolean
	}
	if (!r.verseId) return null
	return {
		verseId: r.verseId,
		step: typeof r.step === 'number' ? r.step : r.ref || r.head ? 1 : 0,
	}
}

export function saveData(data: AppData) {
	localStorage.setItem(KEY, JSON.stringify(data))
}
