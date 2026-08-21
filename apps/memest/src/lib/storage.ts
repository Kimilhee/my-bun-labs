import { defaultData } from './app-state'
import { fullLap, orderDays } from './curriculum'
import type { AppData, Session } from './types'

const KEY = 'memest:v1'

export function loadData(): AppData {
	try {
		const raw = localStorage.getItem(KEY)
		if (!raw) return defaultData
		const parsed = JSON.parse(raw) as Partial<AppData> & {
			session?: (Session & { mode: string }) | null // v0.2까지의 단일 세션
			progress?: Record<string, unknown> // v0.3.0까지의 Leitner 기록
			daily?: Partial<AppData['daily']> & { cursor?: number }
		}
		const settings = { ...defaultData.settings, ...parsed.settings }
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
							settings.dailyOrder,
						),
				doneDate: parsed.daily?.doneDate ?? null,
			},
			sessions: {
				daily: sessions.daily ?? null,
				drill: sessions.drill ?? null,
			},
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

export function saveData(data: AppData) {
	localStorage.setItem(KEY, JSON.stringify(data))
}
