import { isStarred, verseById, verses } from './data'
import { todayStr } from './scheduler'
import type { AppData } from './types'

/**
 * 복습 범위 항목: 파트 코드(`conf5` = 파트 전체) 또는 `코드#중제목`(그 중제목만).
 * 예전에 저장된 값은 전부 순수 코드라 그대로 동작한다 (하위호환).
 */
export const scopeKey = (code: string, midTitle: string | null) =>
	midTitle === null ? code : `${code}#${midTitle}`

/** 복습 범위 판정 (null = 전체) */
export function inScope(id: string, scope: string[] | null): boolean {
	if (scope === null) return true
	const mid = verseById.get(id)?.midTitle ?? null
	return scope.some((entry) => {
		const cut = entry.indexOf('#')
		if (cut < 0) return id.startsWith(`${entry}-`)
		return (
			id.startsWith(`${entry.slice(0, cut)}-`) && mid === entry.slice(cut + 1)
		)
	})
}

/** due 도래 카드 우선, 남는 자리에 미진단 카드 순서대로 (복습 범위 내에서만) */
export function buildDailyQueue(data: AppData): string[] {
	const today = todayStr()
	const due: string[] = []
	const unseen: string[] = []
	for (const v of verses) {
		if (!inScope(v.id, data.settings.scopeParts)) continue
		const p = data.progress[v.id]
		if (!p) unseen.push(v.id)
		else if (p.due <= today) due.push(v.id)
	}
	due.sort((a, b) =>
		(data.progress[a]?.due ?? '').localeCompare(data.progress[b]?.due ?? ''),
	)
	return [...due, ...unseen].slice(0, data.settings.dailySize)
}

/** 하드드릴이 켜져 있으면 남은 부채가 깊은 카드부터 앞에 세운다 (정렬은 안정적) */
export function buildIntensiveQueue(
	codes: string[],
	starredOnly: boolean,
	cap: number,
	stars: AppData['stars'],
	drill?: Record<string, number>,
): string[] {
	const ids = verses
		.filter(
			(v) =>
				codes.some((c) => v.id.startsWith(`${c}-`)) &&
				(!starredOnly || isStarred(stars, v)),
		)
		.map((v) => v.id)
	if (drill) ids.sort((a, b) => (drill[a] ?? 0) - (drill[b] ?? 0))
	return ids.slice(0, cap)
}
