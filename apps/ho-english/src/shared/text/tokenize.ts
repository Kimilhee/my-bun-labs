export type Chunk = { text: string }

export function tokenize(text: string): string[] {
	return text.split(/\s+/).filter(Boolean)
}

export function toChunks(
	words: string[],
	boundaries: Iterable<number>,
): Chunk[] {
	const sorted = [...new Set(boundaries)].sort((a, b) => a - b)
	const result: Chunk[] = []
	let cursor = 0
	for (const b of sorted) {
		if (b < cursor || b >= words.length) continue
		result.push({ text: words.slice(cursor, b + 1).join(' ') })
		cursor = b + 1
	}
	if (cursor < words.length) {
		result.push({ text: words.slice(cursor).join(' ') })
	}
	return result
}
