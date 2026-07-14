import type { Level, Verse } from './types'

const CHO = [
	'ㄱ',
	'ㄲ',
	'ㄴ',
	'ㄷ',
	'ㄸ',
	'ㄹ',
	'ㅁ',
	'ㅂ',
	'ㅃ',
	'ㅅ',
	'ㅆ',
	'ㅇ',
	'ㅈ',
	'ㅉ',
	'ㅊ',
	'ㅋ',
	'ㅌ',
	'ㅍ',
	'ㅎ',
]

export function choseong(s: string): string {
	let out = ''
	for (const ch of s) {
		const code = (ch.codePointAt(0) ?? 0) - 0xac00
		out += code >= 0 && code < 11172 ? (CHO[Math.floor(code / 588)] ?? ch) : ch
	}
	return out
}

/** 말씀 첫머리 (리스트 표시·초성 힌트용) */
export const opening = (text: string, len = 16): string =>
	text.length <= len ? text : `${text.slice(0, len)}…`

export const firstWord = (text: string): string => text.split(/\s+/)[0] ?? ''

export type HintLayer = { label: string; content: string }

/** 못 떠올릴수록 한 겹씩 벗겨지는 힌트. 마지막 겹 다음은 정답 공개. */
export function hintLayers(
	verse: Verse,
	level: Level | undefined,
): HintLayer[] {
	const layers: HintLayer[] = []
	if (level === 'D') {
		const title = verse.midTitle
			? `${verse.midTitle} · ${verse.title}`
			: verse.title
		layers.push({ label: '제목', content: title })
	}
	layers.push({ label: '초성', content: choseong(opening(verse.text)) })
	layers.push({ label: '첫 어절', content: `${firstWord(verse.text)} …` })
	return layers
}
