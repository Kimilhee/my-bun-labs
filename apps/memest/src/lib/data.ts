import partsJson from '../../data/parts.json'
import versesJson from '../../data/verses.json'
import type { Part, Verse } from './types'

export const verses = versesJson as unknown as Verse[]
export const parts = partsJson as unknown as Part[]

export const verseById = new Map(verses.map((v) => [v.id, v]))

export function mustVerse(id: string): Verse {
	const v = verseById.get(id)
	if (!v) throw new Error(`unknown verse id: ${id}`)
	return v
}
