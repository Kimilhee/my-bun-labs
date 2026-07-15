// 본문 어절 토큰화 — 더블탭으로 한 어절씩 열어주는 기능의 단위.
// (음성인식 따라 열림은 STT 정확도 문제로 제거됨 — ADR-15)

export type FollowWord = { text: string; start: number; end: number }

const hasContent = (s: string) => /[가-힣0-9a-zA-Z]/.test(s)

export function followWords(verseText: string): FollowWord[] {
	const words: FollowWord[] = []
	for (const m of verseText.matchAll(/\S+/g)) {
		if (hasContent(m[0]))
			words.push({ text: m[0], start: m.index, end: m.index + m[0].length })
	}
	return words
}
