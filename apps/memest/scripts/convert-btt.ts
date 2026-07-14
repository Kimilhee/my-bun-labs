// BTT(AutoHotkey 암송 타자연습) 카드 파일 → verses.json 변환기
// 입력: data/raw-utf8/card*.txt (EUC-KR 원본을 UTF-8로 변환해 둔 것, 탭 구분)
// 실행: bun run scripts/convert-btt.ts

type Verse = {
	id: string // 파트코드-순번 (예: "dep4-07")
	part: string // 파트 표시명 (예: "DEP 4. 기도")
	midTitle: string | null // 중제목
	title: string // 소제목 (카드 제목)
	ref: string // 장절
	text: string // 한글 말씀
	textEn: string | null
	note: string | null // 원본의 @& 뒤에 붙어 있던 부가 메모
	order: number // 파트 내 순번 (1부터)
	starred: boolean // 원본에서 * 표시(잘 안 외워졌던 카드)가 있던 것
}

const DATA_DIR = new URL('../data/raw-utf8/', import.meta.url).pathname
const OUT_FILE = new URL('../data/verses.json', import.meta.url).pathname

// "본문@&메모1@&메모2" → [본문, "메모1 / 메모2"]
function splitNote(s: string): [string, string | null] {
	const [main = '', ...rest] = s.split('@&').map((t) => t.trim())
	const note = rest.filter(Boolean).join(' / ')
	return [main, note || null]
}

async function readRows(file: string): Promise<string[][]> {
	const raw = await Bun.file(DATA_DIR + file).text()
	return raw
		.split('\n')
		.filter((l) => l.trim())
		.map((l) => l.split('\t').map((c) => c.trim()))
}

const verses: Verse[] = []
const notes: string[] = []

function push(
	v: Omit<Verse, 'id' | 'order' | 'starred'>,
	code: string,
	order: number,
) {
	const starred = /\*/.test(v.ref + v.title + v.text)
	const strip = (s: string) => s.replace(/\*/g, '').trim()
	verses.push({
		...v,
		ref: strip(v.ref),
		title: strip(v.title),
		text: strip(v.text),
		starred,
		id: `${code}-${String(order).padStart(2, '0')}`,
		order,
	})
}

// ── card005: 5확신 ─────────────────────────────────────────────
for (const [i, row] of (await readRows('card005.txt')).entries()) {
	const [ref = '', title = '', textRaw = '', , ...en] = row
	const [text, note] = splitNote(textRaw)
	push(
		{
			part: '5확신',
			midTitle: null,
			title,
			ref,
			text,
			textEn: en.filter(Boolean).join(' ') || null,
			note,
		},
		'conf5',
		i + 1,
	)
}

// ── card008: 8가지 생활지침 ────────────────────────────────────
for (const [i, row] of (await readRows('card008.txt')).entries()) {
	const [ref = '', title = '', textRaw = '', , ...en] = row
	const [text, note] = splitNote(textRaw)
	push(
		{
			part: '8생활지침',
			midTitle: null,
			title,
			ref,
			text,
			textEn: en.filter(Boolean).join(' ') || null,
			note,
		},
		'life8',
		i + 1,
	)
}

// ── card060: 60구절 (중제목 A~E × 12) ──────────────────────────
for (const [i, row] of (await readRows('card060.txt')).entries()) {
	const [ref = '', title = '', textRaw = '', group = '', , ...en] = row
	const [text, note] = splitNote(textRaw)
	const midTitle = splitNote(group)[0].replace(/\s*-\s*\d+\s*$/, '')
	push(
		{
			part: '60구절',
			midTitle,
			title,
			ref,
			text,
			textEn: en.filter(Boolean).join(' ') || null,
			note,
		},
		'tms60',
		i + 1,
	)
}

// ── card180: 시리즈 1~5 (S{n}_{m}. 중제목 - NN) ─────────────────
const seriesOrder: Record<string, number> = {}
for (const row of await readRows('card180.txt')) {
	const [ref = '', title = '', textRaw = '', groupRaw = '', ...en] = row
	const [text, textNote] = splitNote(textRaw)
	const [group, groupNote] = splitNote(groupRaw)
	const m = group.match(/^S(\d)_\d\.\s*(.+?)\s*-\s*\d+\s*$/)
	if (!m) throw new Error(`card180 그룹 파싱 실패: ${groupRaw}`)
	const [, sNum = '', midRaw = ''] = m
	const midTitle = midRaw === '예수님' ? '예수 그리스도' : midRaw // 공식 명칭으로 교정

	const code = `s${sNum}`
	const orderInSeries = (seriesOrder[code] ?? 0) + 1
	seriesOrder[code] = orderInSeries
	const note = [textNote, groupNote].filter(Boolean).join(' / ') || null
	push(
		{
			part: `시리즈${sNum}`,
			midTitle,
			title,
			ref,
			text,
			textEn: en.filter(Boolean).join(' ') || null,
			note,
		},
		code,
		orderInSeries,
	)
}

// ── cardDEP: 8파트. 대제목은 데이터에 없어서 중제목 경계로 복원 ──
// 말씀(3열)에 탭이 섞인 행이 있어 원본 AHK처럼 3·4열을 합친다.
const DEP_PARTS: { start: RegExp; name: string }[] = [
	{ start: /^I\.\s*구원의 확신/, name: '구원의 확신' },
	{ start: /^1\.\s*왜 Quiet Time/, name: '경건의 시간' },
	{ start: /^1\.\s*말씀의 권위/, name: '말씀' },
	{ start: /^1\.\s*기도의 명령/, name: '기도' },
	{ start: /^1\.\s*교제의 기초/, name: '교제' },
	{ start: /^1\.\s*전도는 누구의 책임/, name: '증거' },
	{ start: /^1\.\s*주재권을 인정해야/, name: '그리스도의 주재권' },
	{ start: /^세계비전/, name: '세계비전' },
]
let depPart = 0 // 현재 파트 인덱스 (1~8)
let depOrder = 0
for (const row of await readRows('cardDEP.txt')) {
	const [ref = '', title = '', text3 = '', text4 = '', groupRaw = '', ...en] =
		row
	const [text, textNote] = splitNote([text3, text4].filter(Boolean).join(' '))
	const [group, groupNote] = splitNote(groupRaw)
	if (depPart < DEP_PARTS.length && DEP_PARTS[depPart]?.start.test(group)) {
		depPart++
		depOrder = 0
	}
	const partMeta = DEP_PARTS[depPart - 1]
	if (!partMeta) throw new Error(`cardDEP 첫 파트 인식 실패: ${groupRaw}`)
	depOrder++
	// 중제목: 카테고리에서 순번(#NN, NN)과 괄호 메모 제거. 1파트는 카테고리가 대제목 자체라 중제목 없음.
	const cleaned = group
		.replace(/\s*#\s*\d*.*$/, '')
		.replace(/\s+\d+\s*$/, '')
		.trim()
	// 1파트는 카테고리가 대제목 자체, 8파트(세계비전)는 중제목 구분이 없음.
	const midTitle = depPart === 1 || depPart === 8 ? null : cleaned
	const note = [textNote, groupNote].filter(Boolean).join(' / ') || null
	push(
		{
			part: `DEP ${depPart}. ${partMeta.name}`,
			midTitle,
			title,
			ref,
			text,
			textEn: en.filter(Boolean).join(' ') || null,
			note,
		},
		`dep${depPart}`,
		depOrder,
	)
}

// ── 파트 카탈로그 (대제목은 사용자 제공 명칭, 중제목은 카드 데이터에서 유도) ──
const OUT_PARTS = new URL('../data/parts.json', import.meta.url).pathname
const SERIES_TITLES: Record<string, string> = {
	시리즈1: '하나님을 알아감',
	시리즈2: '사랑 안에서 자라감',
	시리즈3: '믿음 안에서 자라감',
	시리즈4: '승리 안에서 행함',
	시리즈5: '그리스도를 증거함',
}
const midTitlesOf = (part: string) => [
	...new Set(
		verses
			.filter((v) => v.part === part && v.midTitle)
			.map((v) => v.midTitle as string),
	),
]
const parts = [...new Set(verses.map((v) => v.part))].map((part) => ({
	part,
	code: verses.find((v) => v.part === part)?.id.replace(/-\d+$/, ''),
	title: SERIES_TITLES[part] ?? part.replace(/^DEP \d+\.\s*/, ''),
	midTitles: midTitlesOf(part),
	count: verses.filter((v) => v.part === part).length,
}))

// ── 검증 & 출력 ────────────────────────────────────────────────
const byPart = new Map<string, number>()
for (const v of verses) byPart.set(v.part, (byPart.get(v.part) ?? 0) + 1)
for (const [part, n] of byPart) notes.push(`${part}: ${n}개`)
const total = verses.length
if (total !== 5 + 8 + 60 + 180 + 242)
	throw new Error(`총 구절 수 불일치: ${total}`)
for (const v of verses) {
	if (!v.ref || !v.title || !v.text)
		throw new Error(`빈 필드: ${v.id} ${JSON.stringify(v)}`)
}

await Bun.write(OUT_FILE, `${JSON.stringify(verses, null, '\t')}\n`)
await Bun.write(OUT_PARTS, `${JSON.stringify(parts, null, '\t')}\n`)
console.log(notes.join('\n'))
console.log(
	`총 ${total}개 (별표 ${verses.filter((v) => v.starred).length}개) → ${OUT_FILE}`,
)
console.log(`파트 ${parts.length}개 → ${OUT_PARTS}`)
