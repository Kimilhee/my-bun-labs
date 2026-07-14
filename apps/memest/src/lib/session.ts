import { verses } from './data'
import { todayStr } from './scheduler'
import type { AppData } from './types'

/** due 도래 카드 우선, 남는 자리에 미진단 카드 순서대로 */
export function buildDailyQueue(data: AppData): string[] {
	const today = todayStr()
	const due: string[] = []
	const unseen: string[] = []
	for (const v of verses) {
		const p = data.progress[v.id]
		if (!p) unseen.push(v.id)
		else if (p.due <= today) due.push(v.id)
	}
	due.sort((a, b) =>
		(data.progress[a]?.due ?? '').localeCompare(data.progress[b]?.due ?? ''),
	)
	return [...due, ...unseen].slice(0, data.settings.dailySize)
}

export function buildIntensiveQueue(
	codes: string[],
	starredOnly: boolean,
	cap: number,
): string[] {
	return verses
		.filter(
			(v) =>
				codes.some((c) => v.id.startsWith(`${c}-`)) &&
				(!starredOnly || v.starred),
		)
		.map((v) => v.id)
		.slice(0, cap)
}
