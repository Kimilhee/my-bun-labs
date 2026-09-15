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

/** 구절을 어떤 차례로 볼지 (두 모드 공통). 하드 드릴은 부채 정렬이 이 위에 얹힌다 */
export type ReviewOrder = 'forward' | 'backward' | 'shuffle'

export type Settings = {
	mode: SessionMode // 지금 어느 모드에 있는지 (앱을 다시 열어도 유지)
	reviewOrder: ReviewOrder // 복습 차례 (매일 복습의 묶음·구절, 하드 드릴의 기본 차례)
	scopeParts: string[] | null // 하드드릴에서 마지막으로 고른 범위 (null = 전체)
	listFull: boolean // 구절 리스트 시트를 전체 높이로 열지 (반만 선택하면 기억)
}

/**
 * 매일 복습의 진도. cursor(몇 번째)가 아니라 **이번 바퀴에 남은 묶음 큐**다 —
 * 순서 설정을 도중에 바꿔도 남은 것만 다시 줄 세우면 되므로 중복도 누락도 없다.
 */
export type DailyProgress = {
	order: number[] // curriculum.days의 인덱스, order[0]이 오늘 분량
	doneDate: string | null // 마지막으로 하루치를 끝낸 날 (오늘이면 오늘 분량 끝)
}

/** 누적 기록 (정렬·통계용, 모드 무관). 스케줄러 입력이 아니다. */
export type Stats = {
	wrong: number
	hints: number
}

/** 짝 맞추기 기록 (범위별 최소 턴과 그때의 최고 연속) */
export type PairRecord = { turns: number; streak: number }

/**
 * 짝 맞추기 진행. 왼쪽 열(`refs` = 장절)과 오른쪽 열(`heads` = 첫 소절)은 같은
 * 카드 집합을 서로 다른 순서로 담는 **슬롯 배열**이다 (null = 빈 자리).
 * 빈 자리는 2개가 모였을 때만 채운다 — 한 장씩 채우면 새로 들어온 두 타일이
 * 반드시 짝이라 몰라도 맞출 수 있게 되기 때문.
 */
export type PairGame = {
	scope: string[] | null
	starredOnly: boolean
	total: number // 범위의 전체 쌍 수 (진행률 분모)
	done: number // 졸업한(부채를 다 갚은) 쌍 수
	deck: string[] // 아직 안 나온 구절 + 되돌아온 구절 (셔플됨)
	refs: (string | null)[]
	heads: (string | null)[]
	born: Record<string, number> // verseId → 보드에 등장한 시점의 턴 수 (나이 계산용)
	/** 카드별 부채(음수). 방치 턴마다 −1, 맞추면 +5. 0 이상이 되면 졸업하고 항목 삭제 */
	debt: Record<string, number>
	turn: number // 완료된 판정 횟수 (맞춘 것·틀린 것 모두)
	streak: number // 연속으로 맞춘 수 (틀리면 0)
	bestStreak: number
	misses: number
	/** 회색(오래 남은) 카드를 맞췄을 때의 각인 단계 — 두 타일을 각각 눌러야 넘어간다 */
	review: { verseId: string; ref: boolean; head: boolean } | null
}

export type AppData = {
	seen: Record<string, string> // verseId → 마지막으로 본 날 (리스트의 "다뤄본 구절" 판정)
	drill: Record<string, number> // verseId → 부채 점수(음수). 갚으면 항목 삭제
	stars: Record<string, boolean> // 수동 별표. 없으면 BTT 원본의 Verse.starred를 쓴다
	stats: Record<string, Stats>
	settings: Settings
	daily: DailyProgress
	/** 모드별로 따로 보관 — 오가도 각자의 진행이 그대로 남는다 */
	sessions: { daily: Session | null; drill: Session | null }
	/** 진행 중인 짝 맞추기 (없으면 null). 범위가 커서 한 판이 길기에 이어하기를 지원 */
	pair: PairGame | null
	/** 짝 맞추기 최고 기록 (범위 서명 → 기록) */
	pairBest: Record<string, PairRecord>
}
