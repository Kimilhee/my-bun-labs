import { defaultData } from './app-state'
import type { AppData, Session } from './types'

const KEY = 'memest:v1'

export function loadData(): AppData {
	try {
		const raw = localStorage.getItem(KEY)
		if (!raw) return defaultData
		const parsed = JSON.parse(raw) as Partial<AppData> & {
			session?: (Session & { mode: string }) | null // v0.2까지의 단일 세션
			settings?: Partial<AppData['settings']> & { hardDrill?: boolean }
		}
		const settings = { ...defaultData.settings, ...parsed.settings }
		const sessions = parsed.sessions ?? migrateSession(parsed.session)
		return {
			progress: parsed.progress ?? {},
			drill: parsed.drill ?? {},
			stars: parsed.stars ?? {},
			stats: parsed.stats ?? {},
			settings,
			daily: { ...defaultData.daily, ...parsed.daily },
			sessions: {
				daily: sessions.daily ?? null,
				drill: sessions.drill ?? null,
			},
		}
	} catch {
		return defaultData
	}
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
