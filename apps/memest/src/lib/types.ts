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

/** 두 모드는 완전히 별개의 세션으로, 서로의 진행 상태에 영향을 주지 않는다 */
export type SessionMode = 'daily' | 'drill'

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
	scopeCodes: string[] | null // 하드드릴 세션이 어떤 범위로 만들어졌는지 (표시용)
	stage: 'cue' | 'answer' | 'done'
	hintsUsed: number
	revealed: boolean
	peeked?: boolean // 현재 카드가 전문 공개 상태로 열림 (브라우징) — 채점 제외
	revealedWords?: number // 더블탭으로 연 어절 수 (하드드릴 감점 대상)
}

export type Settings = {
	mode: SessionMode // 지금 어느 모드에 있는지 (앱을 다시 열어도 유지)
	scopeParts: string[] | null // 하드드릴에서 마지막으로 고른 범위 (null = 전체)
	listFull: boolean // 구절 리스트 시트를 전체 높이로 열지 (반만 선택하면 기억)
}

/** 매일 복습의 진도 (curriculum.days의 인덱스) */
export type DailyProgress = {
	cursor: number // 다음에 할 하루치
	doneDate: string | null // 마지막으로 하루치를 끝낸 날 (오늘이면 오늘 분량 끝)
}

/** 누적 기록 (정렬·통계용, 모드 무관). 스케줄러 입력이 아니다. */
export type Stats = {
	wrong: number
	hints: number
}

export type AppData = {
	progress: Record<string, Progress>
	drill: Record<string, number> // verseId → 부채 점수(음수). 갚으면 항목 삭제
	stars: Record<string, boolean> // 수동 별표. 없으면 BTT 원본의 Verse.starred를 쓴다
	stats: Record<string, Stats>
	settings: Settings
	daily: DailyProgress
	/** 모드별로 따로 보관 — 오가도 각자의 진행이 그대로 남는다 */
	sessions: { daily: Session | null; drill: Session | null }
}
