// 암송 따라 열림(follow-along) 매칭.
// 어절(단어) 단위로 자모(초성·중성·종성) LCS를 계산해, 음성이 진행된 만큼
// 본문을 앞에서부터 공개한다. STT 정확도가 낮아도 따라올 수 있도록
// 어절당 자모 20%만 겹치면 도달한 것으로 본다.

const CHO = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ'
const JUNG = 'ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ'
const JONG = ' ㄱㄲㄳㄴㄵㄶㄷㄹㄺㄻㄼㄽㄾㄿㅀㅁㅂㅄㅅㅆㅇㅈㅊㅋㅌㅍㅎ'

/** 어절이 도달로 인정되는 자모 일치율 */
const FOLLOW_THRESHOLD = 0.2

/** 한글 음절을 자모로 분해 (그 외 문자는 그대로) */
export function toJamo(s: string): string {
	let out = ''
	for (const ch of s) {
		const code = (ch.codePointAt(0) ?? 0) - 0xac00
		if (code >= 0 && code < 11172) {
			out += CHO[Math.floor(code / 588)] ?? ''
			out += JUNG[Math.floor((code % 588) / 28)] ?? ''
			const jong = code % 28
			if (jong > 0) out += JONG[jong] ?? ''
		} else out += ch
	}
	return out
}

/** 한글·영숫자만 남김 */
const compact = (s: string) => s.replace(/[^가-힣0-9a-zA-Z]/g, '')

/** 홀로 선 추임새 토큰 제거 */
export const stripFillers = (s: string) =>
	s.replace(/(^|\s)(음+|어+|아+|그+|저기?|막)(?=\s|$)/g, ' ')

/** a와 b의 LCS 길이와, b에서 마지막으로 매칭된 위치 */
function lcsMatch(a: string, b: string): { hits: number; lastB: number } {
	const n = a.length
	const m = b.length
	if (n === 0 || m === 0) return { hits: 0, lastB: -1 }
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
	const hits = dp[n]?.[m] ?? 0
	let lastB = -1
	let i = n
	let j = m
	while (i > 0 && j > 0) {
		// 같은 LCS 길이면 b를 먼저 줄여 매칭을 앞쪽(작은 j)으로 당긴다
		// — 포인터가 뒤 어절의 자모까지 삼키는 것을 방지
		if ((dp[i]?.[j - 1] ?? 0) === (dp[i]?.[j] ?? 0)) {
			j--
			continue
		}
		if (
			a[i - 1] === b[j - 1] &&
			(dp[i]?.[j] ?? 0) === (dp[i - 1]?.[j - 1] ?? 0) + 1
		) {
			if (lastB < 0) lastB = j - 1 // 역추적에서 처음 만나는 매칭 = 가장 뒤의 매칭
			i--
			j--
		} else i--
	}
	return { hits, lastB }
}

export type FollowWord = { text: string; start: number; end: number }

/** 채점 대상 어절 목록. 첫소절 모드는 처음 10글자(공백 제외)가 걸치는 어절까지. */
export function followWords(
	verseText: string,
	firstPhraseMode: boolean,
): FollowWord[] {
	const words: FollowWord[] = []
	for (const m of verseText.matchAll(/\S+/g)) {
		if (compact(m[0]).length > 0)
			words.push({ text: m[0], start: m.index, end: m.index + m[0].length })
	}
	if (!firstPhraseMode) return words
	let acc = 0
	for (let i = 0; i < words.length; i++) {
		acc += compact(words[i]?.text ?? '').length
		if (acc >= 10) return words.slice(0, i + 1)
	}
	return words
}

/**
 * 음성이 본문 어절 몇 개째까지 도달했는지.
 * 어절을 앞에서부터 순차적으로, 말한 분량만큼의 창(window) 안에서만 매칭한다
 * ("대충 글자수가 맞아야" 진도가 나감 — 짧게 말했는데 뒤쪽 어절이 열리는 것 방지).
 * 어절이 20% 미만이면 거기서 멈춘다 (막힌 어절은 두 번 터치로 수동 공개).
 */
export function followProgress(words: FollowWord[], spoken: string): number {
	const s = toJamo(compact(stripFillers(spoken)))
	if (!s) return 0
	let p = 0 // 음성 자모에서 소비한 위치
	let i = 0
	while (i < words.length) {
		const wj = toJamo(compact(words[i]?.text ?? ''))
		const win = s.slice(p, p + wj.length * 2 + 6)
		if (!win) break
		const m1 = lcsMatch(wj, win)
		if (m1.hits / wj.length >= FOLLOW_THRESHOLD) {
			p += m1.lastB + 1
			i++
			continue
		}
		// 한 어절 건너뛰기 허용: 이번 어절이 심하게 뭉개졌어도 다음 어절이 이어지면 함께 연다
		const next = words[i + 1]
		if (!next) break
		const nj = toJamo(compact(next.text))
		const win2 = s.slice(p, p + (wj.length + nj.length) * 2 + 6)
		const m2 = lcsMatch(nj, win2)
		if (m2.hits / nj.length < FOLLOW_THRESHOLD) break
		p += m2.lastB + 1
		i += 2
	}
	return i > words.length ? words.length : i
}
