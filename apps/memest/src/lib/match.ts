// 본문 어절 토큰화(더블탭 어절 열기의 단위)와 첫머리 음성 확인 매칭.
// 전체 암송 음성 채점은 STT 정확도 문제로 제거됨(ADR-15) — 첫머리처럼 짧은
// 구간의 확인만 글자 단위(자모 분해 없음) 50% 기준으로 허용한다(ADR-16).

export type FollowWord = { text: string; start: number; end: number }

const hasContent = (s: string) => /[가-힣0-9a-zA-Z]/.test(s)
const compact = (s: string) => s.replace(/[^가-힣0-9a-zA-Z]/g, '')

export function followWords(verseText: string): FollowWord[] {
	const words: FollowWord[] = []
	for (const m of verseText.matchAll(/\S+/g)) {
		if (hasContent(m[0]))
			words.push({ text: m[0], start: m.index, end: m.index + m[0].length })
	}
	return words
}

/** 첫머리 = 공백 제외 10글자가 걸치는 어절까지 */
export function firstPhrase(verseText: string): string {
	const words = followWords(verseText)
	let acc = 0
	for (let i = 0; i < words.length; i++) {
		acc += compact(words[i]?.text ?? '').length
		if (acc >= 10)
			return words
				.slice(0, i + 1)
				.map((w) => w.text)
				.join(' ')
	}
	return words.map((w) => w.text).join(' ')
}

/** 글자 단위 LCS 길이 (자모 분해 없음) */
function lcsLen(a: string, b: string): number {
	const n = a.length
	const m = b.length
	if (n === 0 || m === 0) return 0
	const dp: Uint16Array[] = Array.from(
		{ length: n + 1 },
		() => new Uint16Array(m + 1),
	)
	for (let i = 1; i <= n; i++) {
		const row = dp[i]
		const prev = dp[i - 1]
		if (!row || !prev) continue
		for (let j = 1; j <= m; j++) {
			row[j] =
				a[i - 1] === b[j - 1]
					? (prev[j - 1] ?? 0) + 1
					: Math.max(prev[j] ?? 0, row[j - 1] ?? 0)
		}
	}
	return dp[n]?.[m] ?? 0
}

/** 첫머리 음성 확인: 글자 단위 일치율 50% 이상이면 통과 */
export function firstPhraseMatch(
	verseText: string,
	spoken: string,
): { ratio: number; pass: boolean } {
	const target = compact(firstPhrase(verseText))
	const said = compact(spoken)
	if (!target || !said) return { ratio: 0, pass: false }
	const ratio = lcsLen(target, said) / target.length
	return { ratio, pass: ratio >= 0.5 }
}
