import { defaultData } from './app-state'
import type { AppData } from './types'

const KEY = 'memest:v1'

export function loadData(): AppData {
	try {
		const raw = localStorage.getItem(KEY)
		if (!raw) return defaultData
		const parsed = JSON.parse(raw) as Partial<AppData>
		return {
			progress: parsed.progress ?? {},
			settings: { ...defaultData.settings, ...parsed.settings },
			session: parsed.session ?? null,
		}
	} catch {
		return defaultData
	}
}

export function saveData(data: AppData) {
	localStorage.setItem(KEY, JSON.stringify(data))
}
