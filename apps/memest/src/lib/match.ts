// 암송 음성과 본문의 대조.
// 어절(단어) 단위로 채점하고, 각 어절은 자모(초성·중성·종성)로 분해해 LCS로 비교한다.
// 자모 비교라 "미쁘사"를 "미프사"로 받아적는 류의 오인식은 크게 깎이지 않고,
// 옛말 어절(archaic.ts 사전)은 50%만 겹쳐도 맞은 것으로 본다.
// 정렬 정보로 받아적기(내가 말한 것) 쪽도 불일치 하이라이트하며,
// 옛말 50% 통과 어절은 STT 오기 대신 본문의 원 단어로 교정해 보여준다.

import { isArchaic } from './archaic'

const CHO = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ'
const JUNG = 'ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ'
const JONG = ' ㄱㄲㄳㄴㄵㄶㄷㄹㄺㄻㄼㄽㄾㄿㅀㅁㅂㅄㅅㅆㅇㅈㅊㅋㅌㅍㅎ'

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

const isContent = (ch: string) => /[가-힣0-9a-zA-Z]/.test(ch)

/** 한글·영숫자만 남김 */
const compact = (s: string) => s.replace(/[^가-힣0-9a-zA-Z]/g, '')

/** 홀로 선 추임새 토큰 제거 (본문 단어 속 글자는 건드리지 않음) */
export const stripFillers = (s: string) =>
	s.replace(/(^|\s)(음+|어+|아+|그+|저기?|막)(?=\s|$)/g, ' ')

/** LCS 정렬: a의 각 인덱스가 b의 어느 인덱스와 짝지어졌는지 (-1 = 미매칭) */
function lcsAlign(a: string, b: string): number[] {
	const n = a.length
	const m = b.length
	const align: number[] = new Array(n).fill(-1)
	if (n === 0 || m === 0) return align
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
	let i = n
	let j = m
	while (i > 0 && j > 0) {
		if (
			a[i - 1] === b[j - 1] &&
			(dp[i]?.[j] ?? 0) === (dp[i - 1]?.[j - 1] ?? 0) + 1
		) {
			align[i - 1] = j - 1
			i--
			j--
		} else if ((dp[i - 1]?.[j] ?? 0) >= (dp[i]?.[j - 1] ?? 0)) i--
		else j--
	}
	return align
}

export type WordScore = {
	text: string
	start: number // 원문에서의 시작 인덱스
	end: number
	sim: number // 자모 일치율 0~1
	archaic: boolean
	pass: boolean
}

/** 받아적기 표시 조각. fixed = 옛말 교정(본문 단어로 대체됨) */
export type SpokenSeg = { text: string; kind: 'ok' | 'miss' | 'fixed' }

export type Grade = {
	pass: boolean
	perfect: boolean // 자동 진행 조건: 전체 통과 + 일반 어절은 모두 100% 일치
	coverage: number // 통과 어절 비율 0~1 (채점용 — 옛말 50% 통과 어절도 1로 침)
	similarity: number // 실제 자모 일치율 0~1 (표시용)
	missIndices: Set<number> // 원문 기준, 못 맞춘 어절의 글자 위치 (하이라이트용)
	words: WordScore[]
	spokenSegs: SpokenSeg[] // 받아적기(추임새 제거본)의 하이라이트 조각
}

const ARCHAIC_THRESHOLD = 0.5
const NORMAL_THRESHOLD = 0.8
// 옛말 어절이 이 미만이면 통과는 되지만 자동 진행 없이 대조 화면을 거침
// (긴 옛말 어미(느니라 등)만 겹치고 어간이 다른 "진짜 오류"가 가려지는 걸 방지)
const ARCHAIC_PERFECT = 0.75

/**
 * 채점. 첫소절 모드는 본문 처음 10글자(공백 제외)가 걸치는 어절까지만 대상.
 * 통과: 어절 통과율이 전체 모드 85%, 첫소절 모드 80% 이상.
 */
export function gradeRecitation(
	verseText: string,
	spoken: string,
	firstPhraseMode: boolean,
): Grade {
	// 어절 토큰화 (원문 위치 보존, 한글·영숫자가 없는 토큰은 채점 제외)
	const words: { text: string; start: number; end: number; jamo: string }[] = []
	for (const m of verseText.matchAll(/\S+/g)) {
		const jamo = toJamo(compact(m[0]))
		if (jamo.length > 0)
			words.push({
				text: m[0],
				start: m.index,
				end: m.index + m[0].length,
				jamo,
			})
	}

	// 첫소절 모드: 공백 제외 10글자가 채워지는 어절까지
	let scope = words
	if (firstPhraseMode) {
		let acc = 0
		let cut = words.length
		for (let i = 0; i < words.length; i++) {
			acc += compact(words[i]?.text ?? '').length
			if (acc >= 10) {
				cut = i + 1
				break
			}
		}
		scope = words.slice(0, cut)
	}

	// 음성 자모열 (원본 글자 위치 매핑 보존)
	const stripped = stripFillers(spoken).replace(/\s+/g, ' ').trim()
	let spokenJamo = ''
	const jamoChar: number[] = [] // 음성 자모 idx → stripped 글자 idx
	for (let ci = 0; ci < stripped.length; ci++) {
		const ch = stripped[ci] ?? ''
		if (!isContent(ch)) continue
		const j = toJamo(ch)
		spokenJamo += j
		for (let k = 0; k < j.length; k++) jamoChar.push(ci)
	}

	// 본문 자모열 (어절 인덱스 매핑 보존) → LCS 정렬
	let verseJamo = ''
	const wordOf: number[] = []
	scope.forEach((w, wi) => {
		verseJamo += w.jamo
		for (let k = 0; k < w.jamo.length; k++) wordOf.push(wi)
	})
	const align = lcsAlign(verseJamo, spokenJamo)

	// 어절별 매칭 집계
	const hits: number[] = new Array(scope.length).fill(0)
	const charsOfWord: number[][] = Array.from({ length: scope.length }, () => [])
	align.forEach((bIdx, aIdx) => {
		const wi = wordOf[aIdx]
		if (bIdx < 0 || wi === undefined) return
		hits[wi] = (hits[wi] ?? 0) + 1
		const ci = jamoChar[bIdx]
		if (ci !== undefined) charsOfWord[wi]?.push(ci)
	})

	// 어절 채점
	const missIndices = new Set<number>()
	const scores: WordScore[] = []
	let passed = 0
	let perfectAll = true
	scope.forEach((w, wi) => {
		const sim = (hits[wi] ?? 0) / w.jamo.length
		const archaic = isArchaic(w.text)
		const pass = sim >= (archaic ? ARCHAIC_THRESHOLD : NORMAL_THRESHOLD)
		if (pass) passed++
		else for (let i = w.start; i < w.end; i++) missIndices.add(i)
		if (!pass || (!archaic && sim < 1) || (archaic && sim < ARCHAIC_PERFECT))
			perfectAll = false
		scores.push({
			text: w.text,
			start: w.start,
			end: w.end,
			sim,
			archaic,
			pass,
		})
	})

	// 받아적기 하이라이트: 글자별 상태 → 조각으로 병합
	// 기본은 miss(본문에 없는 소리/오인식), 매칭된 글자는 어절 통과 여부를 따라감
	const status: ('ok' | 'miss')[] = Array.from(stripped, () => 'miss')
	const claimed: number[] = new Array(stripped.length).fill(-1)
	scope.forEach((_, wi) => {
		const st = scores[wi]?.pass ? 'ok' : 'miss'
		for (const ci of charsOfWord[wi] ?? []) {
			status[ci] = st
			claimed[ci] = wi
		}
	})
	// 옛말 50% 통과(불완전 일치) 어절: 해당 음성 구간을 본문 단어로 교정
	const fixedAt = new Map<number, { end: number; text: string }>()
	scope.forEach((w, wi) => {
		const sc = scores[wi]
		const chars = charsOfWord[wi] ?? []
		if (!sc?.pass || !sc.archaic || sc.sim >= 1 || chars.length === 0) return
		let start = Math.min(...chars)
		let end = Math.max(...chars)
		// STT가 붙여 적은 단어 경계까지 확장 (다른 어절이 차지한 글자는 침범 안 함)
		while (start > 0) {
			const prev = stripped[start - 1] ?? ' '
			const owner = claimed[start - 1] ?? -1
			if (/\s/.test(prev) || (owner !== -1 && owner !== wi)) break
			start--
		}
		while (end < stripped.length - 1) {
			const next = stripped[end + 1] ?? ' '
			const owner = claimed[end + 1] ?? -1
			if (/\s/.test(next) || (owner !== -1 && owner !== wi)) break
			end++
		}
		fixedAt.set(start, { end, text: compact(w.text) })
	})

	const spokenSegs: SpokenSeg[] = []
	let ci = 0
	while (ci < stripped.length) {
		const fixed = fixedAt.get(ci)
		if (fixed) {
			spokenSegs.push({ text: fixed.text, kind: 'fixed' })
			ci = fixed.end + 1
			continue
		}
		const ch = stripped[ci] ?? ''
		// 공백·문장부호는 직전 조각에 붙임 (조각이 잘게 쪼개지지 않게)
		const kind = isContent(ch) ? (status[ci] ?? 'miss') : null
		const last = spokenSegs[spokenSegs.length - 1]
		if (last && last.kind !== 'fixed' && (kind === null || last.kind === kind))
			last.text += ch
		else if (last?.kind === 'fixed' && kind === null) last.text += ch
		else spokenSegs.push({ text: ch, kind: kind ?? 'ok' })
		ci++
	}

	const coverage = scope.length ? passed / scope.length : 0
	const totalJamo = verseJamo.length
	const matchedJamo = hits.reduce((a, b) => a + b, 0)
	const pass = coverage >= (firstPhraseMode ? 0.8 : 0.85)
	return {
		pass,
		perfect: pass && perfectAll,
		coverage,
		similarity: totalJamo ? matchedJamo / totalJamo : 0,
		missIndices,
		words: scores,
		spokenSegs,
	}
}
