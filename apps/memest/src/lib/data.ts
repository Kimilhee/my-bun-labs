import partsJson from '../../data/parts.json'
import versesJson from '../../data/verses.json'
import type { AppData, Part, Verse } from './types'

export const verses = versesJson as unknown as Verse[]
export const parts = partsJson as unknown as Part[]

export const verseById = new Map(verses.map((v) => [v.id, v]))

export function mustVerse(id: string): Verse {
	const v = verseById.get(id)
	if (!v) throw new Error(`unknown verse id: ${id}`)
	return v
}

/** 별표 상태 — 앱에서 켜고 끈 값이 있으면 그것, 없으면 BTT 원본의 값 */
export function isStarred(stars: AppData['stars'], v: Verse): boolean {
	return stars[v.id] ?? v.starred
}
