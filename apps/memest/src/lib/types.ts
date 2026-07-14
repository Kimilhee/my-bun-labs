export type Verse = {
	id: string
	part: string
	midTitle: string | null
	title: string
	ref: string
	text: string
	textEn: string | null
	note: string | null
	order: number
	starred: boolean
}

export type Part = {
	part: string
	code: string
	title: string
	midTitles: string[]
	count: number
}

/** C = 장절+제목 제시, D = 장절만 (목표 상태) */
export type Level = 'C' | 'D'

export type Progress = {
	level: Level
	box: number // Leitner 박스 0~5
	due: string // YYYY-MM-DD
	streak: number // 힌트 0개 연속 횟수 (C→D 승급용)
}

export type SessionMode = 'daily' | 'intensive'

export type Encounter = {
	verseId: string
	hints: number
	wrong: boolean // 정답 공개까지 갔거나 잘못 떠올림
	counted: boolean // 채점에 반영된 회차인지 (재큐잉 회차는 false)
}

export type Session = {
	mode: SessionMode
	queue: string[] // queue[0]이 현재 카드
	history: Encounter[]
	scopeCodes: string[] | null // 집중 세션의 파트 범위 (리스트 시트용)
	stage: 'cue' | 'answer' | 'done'
	hintsUsed: number
	revealed: boolean
}

export type Settings = {
	dailySize: number
	firstPhraseMode: boolean // 첫소절 매칭: 처음 10글자(공백 제외)만 맞으면 통과
	voiceRecitation: boolean // 끄면 [암송 시작] 대신 [말씀 확인](자가 확인)으로 동작
	scopeParts: string[] | null // 복습 범위 파트 코드 목록 (null = 전체)
}

export type AppData = {
	progress: Record<string, Progress>
	settings: Settings
	session: Session | null
}
