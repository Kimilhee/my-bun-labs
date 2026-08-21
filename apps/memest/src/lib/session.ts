import { ordered } from './curriculum'
import { isStarred, parts, verseById, verses } from './data'
import type { AppData, Session } from './types'

/**
 * 하드드릴 범위 항목: 파트 코드(`conf5` = 파트 전체) 또는 `코드#중제목`(그 중제목만).
 * 예전에 저장된 값은 전부 순수 코드라 그대로 동작한다 (하위호환).
 */
export const scopeKey = (code: string, midTitle: string | null) =>
	midTitle === null ? code : `${code}#${midTitle}`

/** 범위 판정 (null = 전체) */
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

/** 범위를 사람이 읽는 이름으로 (`DEP 3. 말씀(말씀의 가치)`) */
export function scopeLabel(scope: string[] | null): string {
	if (scope === null) return '전체 495구절'
	return (
		scope
			.map((entry) => {
				const cut = entry.indexOf('#')
				const code = cut < 0 ? entry : entry.slice(0, cut)
				const name = parts.find((p) => p.code === code)?.part ?? code
				return cut < 0 ? name : `${name}(${entry.slice(cut + 1)})`
			})
			.join(', ') || '없음'
	)
}

/**
 * 이 세션이 다루는 구절 전체 (목차 순서). 재큐잉으로 큐에 중복이 생겨도 한 번씩.
 * 리스트 시트와 좌우 스와이프 브라우징이 공통으로 쓰는 "세션의 목록"이다.
 */
export function sessionVerseIds(s: Session): string[] {
	const set = new Set([...s.history.map((e) => e.verseId), ...s.queue])
	return verses.filter((v) => set.has(v.id)).map((v) => v.id)
}

/**
 * 하드드릴 큐 — 고른 범위 전체를 **복습 순서 설정대로** 깔고, 그 위에 부채가
 * 깊은 카드를 앞으로 당긴다. 정렬이 안정적이라 부채가 같은(대개 0인) 카드들은
 * 설정한 차례를 그대로 유지한다.
 */
export function buildDrillQueue(
	scope: string[] | null,
	starredOnly: boolean,
	data: AppData,
): string[] {
	const ids = ordered(
		verses
			.filter(
				(v) =>
					inScope(v.id, scope) && (!starredOnly || isStarred(data.stars, v)),
			)
			.map((v) => v.id),
		data.settings.reviewOrder,
	)
	ids.sort((a, b) => (data.drill[a] ?? 0) - (data.drill[b] ?? 0))
	return ids
}
