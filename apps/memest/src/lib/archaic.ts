// 옛말(개역한글 고어체) 사전. STT가 옛말을 현대어로 "교정"해버리는 오인식이 잦아,
// 옛말로 판정된 어절은 자모 일치율 50%만 넘으면 맞은 것으로 처리한다.
// 오인식이 잦은 단어를 발견하면 WORDS에, 어미 패턴이면 SUFFIXES에 추가.

const WORDS = new Set([
	'대저',
	'미쁘사',
	'미쁘시고',
	'내사',
	'뉘',
	'뉘게',
	'무릇',
	'좇아',
	'좇으라',
	'의로우사',
])

const SUFFIXES = [
	'뇨',
	'니라',
	'리라',
	'리요',
	'리로다',
	'로다',
	'도다',
	'거늘',
	'커늘',
	'더라',
	'나니',
	'으매',
	'시매',
	'하사',
	'지어다',
	'지니라',
	'일지니',
	'을지어다',
	'우사', // 의로우사, 세우사 …
	'시사', // 하시사, 붙드시사 …
	'케', // 하게-축약: 깨끗케, 온전케, 성결케 …
	'코', // 하고-축약: 결단코, 맹세코 …
]

export function isArchaic(word: string): boolean {
	const w = word.replace(/[^가-힣]/g, '')
	if (WORDS.has(w)) return true
	return SUFFIXES.some((sfx) => w.length > sfx.length && w.endsWith(sfx))
}
