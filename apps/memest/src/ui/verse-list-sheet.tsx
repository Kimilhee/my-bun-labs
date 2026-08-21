import {
	type TouchEvent as ReactTouchEvent,
	useEffect,
	useRef,
	useState,
} from 'react'
import { isStarred, parts, verseById, verses } from '../lib/data'
import { opening } from '../lib/hints'
import { sessionVerseIds } from '../lib/session'
import type { AppData, Session } from '../lib/types'

/** 대제목(파트) 또는 중제목 범위 — midTitle이 null이면 파트 전체 */
export type TitleScope = { part: string; midTitle: string | null }

type Props = {
	data: AppData
	session: Session
	/** 있으면 복습 범위 대신 이 제목 범위를 1부터 번호를 매겨 보여준다 */
	titleScope?: TitleScope | null
	/** showAnswer면 전문이 열린 정답 화면으로 (이미 복습한 구절의 장절 탭) */
	onPick: (verseId: string, showAnswer: boolean) => void
	/** 전체/반만 선택은 설정에 남아 다음에 열 때도 유지된다 */
	onToggleFull: (full: boolean) => void
	/** 제목 범위에서 좌우 스와이프 → 이전/다음 대제목 */
	onScopeChange?: (scope: TitleScope) => void
	onClose: () => void
}

/**
 * 구절 리스트 (바텀시트). 기본은 복습 범위 전체("지나온 구절"), titleScope가 오면 그 제목 범위.
 * 제목 범위 리스트는 찾아보기가 아니라 암송 확인용이라 본문 첫머리를 감추고,
 * 행을 터치해야 펼쳐 보인다. 이미 다뤄본 구절인지(studied)는 표시가 아니라
 * 장절 탭의 동작(전문부터 vs 단서부터)에만 쓴다.
 */
export function VerseListSheet({
	data,
	session,
	titleScope,
	onPick,
	onToggleFull,
	onScopeChange,
	onClose,
}: Props) {
	const full = data.settings.listFull
	const [expandedId, setExpandedId] = useState<string | null>(null)
	const [starOnly, setStarOnly] = useState(false)
	const touchStart = useRef<{
		x: number
		y: number
		locked: 'h' | 'v' | null // 첫 움직임에서 가로/세로 잠금
	} | null>(null)
	const scrollRef = useRef<HTMLDivElement | null>(null)
	const slideRef = useRef<HTMLDivElement | null>(null) // 스와이프로 움직이는 목록
	const enterFrom = useRef<'left' | 'right' | null>(null) // 다음 목록의 진입 방향

	// 좌우 스와이프로 이전/다음 대제목 (제목 범위 리스트에서만).
	// 세션 카드와 같은 방식: 손가락을 따라 목록이 움직이고(translate3d — GPU 합성),
	// 임계값을 넘기면 슬라이드 아웃 → 새 목록이 반대편에서 슬라이드 인. 못 넘기면 스냅백.
	const partIdx = titleScope
		? parts.findIndex((p) => p.part === titleScope.part)
		: -1
	const prevPart = partIdx > 0 ? parts[partIdx - 1] : undefined
	const nextPart = partIdx >= 0 ? parts[partIdx + 1] : undefined
	const scopeKey = titleScope
		? `${titleScope.part}|${titleScope.midTitle ?? ''}`
		: ''

	// biome-ignore lint/correctness/useExhaustiveDependencies: scopeKey가 목록 전환 신호
	useEffect(() => {
		const el = slideRef.current
		const from = enterFrom.current
		enterFrom.current = null
		scrollRef.current?.scrollTo({ top: 0 })
		if (!el) return
		if (!from) {
			el.style.transition = 'none'
			el.style.transform = ''
			return
		}
		const w = el.clientWidth || window.innerWidth
		el.style.transition = 'none'
		el.style.transform = `translate3d(${from === 'right' ? w : -w}px,0,0)`
		requestAnimationFrame(() =>
			requestAnimationFrame(() => {
				el.style.transition = 'transform 0.24s cubic-bezier(0.2, 0.8, 0.3, 1)'
				el.style.transform = 'translate3d(0,0,0)'
			}),
		)
	}, [scopeKey])

	const onTouchStart = (e: ReactTouchEvent) => {
		const t = e.touches[0]
		touchStart.current = t ? { x: t.clientX, y: t.clientY, locked: null } : null
	}
	const onTouchMove = (e: ReactTouchEvent) => {
		const d = touchStart.current
		const el = slideRef.current
		const t = e.touches[0]
		if (!d || !t || !el || !onScopeChange) return
		const dx = t.clientX - d.x
		const dy = t.clientY - d.y
		if (!d.locked) {
			// 첫 유의미한 움직임에서 방향 고정 — 세로면 스크롤에 양보
			if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return
			d.locked = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v'
		}
		if (d.locked !== 'h') return
		const allowed = dx < 0 ? Boolean(nextPart) : Boolean(prevPart)
		el.style.transition = 'none'
		el.style.transform = `translate3d(${allowed ? dx : dx / 3}px,0,0)` // 막힌 방향은 저항감만
	}
	const onSwipeEnd = (e: ReactTouchEvent) => {
		const d = touchStart.current
		touchStart.current = null
		const el = slideRef.current
		const t = e.changedTouches[0]
		if (!d || !t || !el || d.locked !== 'h') return
		const dx = t.clientX - d.x
		const dir = dx < -60 ? 'left' : dx > 60 ? 'right' : null
		const target =
			dir === 'left' ? nextPart : dir === 'right' ? prevPart : undefined
		if (!dir || !target || !onScopeChange) {
			el.style.transition = 'transform 0.2s cubic-bezier(0.2, 0.8, 0.3, 1)'
			el.style.transform = 'translate3d(0,0,0)'
			return
		}
		const w = el.clientWidth || window.innerWidth
		el.style.transition = 'transform 0.18s ease-in'
		el.style.transform = `translate3d(${dir === 'left' ? -w : w}px,0,0)`
		window.setTimeout(() => {
			enterFrom.current = dir === 'left' ? 'right' : 'left'
			setExpandedId(null)
			onScopeChange({ part: target.part, midTitle: null })
		}, 180)
	}

	const all = titleScope
		? verses.filter(
				(v) =>
					v.part === titleScope.part &&
					(titleScope.midTitle === null || v.midTitle === titleScope.midTitle),
			)
		: // 기본 리스트는 이 세션이 다루는 구절 (매일 복습은 오늘 묶음, 하드드릴은 고른 범위)
			sessionVerseIds(session).flatMap((vid) => {
				const v = verseById.get(vid)
				return v ? [v] : []
			})
	// 별표 필터로 걸러도 일련번호는 범위 안 원래 위치를 유지한다
	const rows = all
		.map((v, i) => ({ v, num: i + 1 }))
		.filter((r) => !starOnly || isStarred(data.stars, r.v))
	const doneNow = new Set(session.history.map((e) => e.verseId))
	const queued = new Set(session.queue)
	const currentId = session.queue[0]

	// 제목 범위에서는 파트가 하나뿐이라 파트 헤더 대신 중제목으로 묶는다
	let lastGroup = ''
	return (
		<div className="sheet-backdrop">
			<button
				type="button"
				className="backdrop-hit"
				onClick={onClose}
				aria-label="닫기"
			/>
			<div className={`sheet ${full ? 'full' : 'half'}`}>
				<div className="sheet-head">
					<b>
						{titleScope
							? (titleScope.midTitle ?? titleScope.part)
							: session.mode === 'daily'
								? '오늘 분량'
								: '드릴 범위'}
					</b>
					<span className="note">{rows.length}개</span>
					<span className="spacer" />
					<button
						type="button"
						className={`icon-btn ${starOnly ? 'on' : ''}`}
						onClick={() => setStarOnly(!starOnly)}
						aria-label="별표만 보기"
					>
						★
					</button>
					<button
						type="button"
						className="icon-btn"
						onClick={() => onToggleFull(!full)}
					>
						{full ? '반만' : '전체'}
					</button>
					<button type="button" className="icon-btn" onClick={onClose}>
						닫기
					</button>
				</div>
				<div
					className="sheet-list"
					ref={scrollRef}
					onTouchStart={onTouchStart}
					onTouchMove={onTouchMove}
					onTouchEnd={onSwipeEnd}
					onTouchCancel={onSwipeEnd}
				>
					<div className="list-slide" ref={slideRef}>
						{rows.map(({ v, num }) => {
							// 기본은 파트로, 제목 범위에서는 중제목으로 묶는다
							const group = titleScope ? (v.midTitle ?? '') : v.part
							const header = group !== lastGroup ? group : null
							lastGroup = group
							// 제목 범위 리스트에서는 현재 카드도 다른 구절과 똑같이 보여준다
							const isCurrent = v.id === currentId && !titleScope
							// 이미 다뤄본 구절인지 — 표시가 아니라 장절 탭의 동작을 가른다
							// (다뤄봤으면 전문부터 = 브라우징, 아니면 단서부터 = 암송)
							const studied =
								doneNow.has(v.id) ||
								Boolean(data.seen[v.id] && !queued.has(v.id))
							return (
								<div key={v.id}>
									{header && <div className="list-part-header">{header}</div>}
									<div className={`list-row ${isCurrent ? 'current' : ''}`}>
										{titleScope && <span className="list-num">{num}</span>}
										<button
											type="button"
											className="list-ref list-ref-btn"
											onClick={() => onPick(v.id, studied)}
											aria-label={`${v.ref} 선택`}
										>
											{v.ref}
										</button>
										{isStarred(data.stars, v) && (
											<span className="star-mini">★</span>
										)}
										<button
											type="button"
											className="list-row-main"
											onClick={() =>
												setExpandedId(expandedId === v.id ? null : v.id)
											}
										>
											{isCurrent && (
												<span className="now-tag">지금 복습중</span>
											)}
											{/* 제목 범위 리스트는 본문을 감춘다 — 터치하면 펼쳐진다 */}
											<span className="list-preview">
												{titleScope
													? v.title
													: `${v.title} — ${opening(v.text, 20)}`}
											</span>
										</button>
										{studied && !titleScope && (
											<button
												type="button"
												className="redo-btn"
												onClick={() => onPick(v.id, false)}
												aria-label={`${v.ref} 다시 암송`}
											>
												⟲
											</button>
										)}
									</div>
									{expandedId === v.id && (
										<div className="list-expanded">
											<div className="hierarchy">
												{v.midTitle ? `${v.midTitle} › ` : ''}
												<b>{v.title}</b>
											</div>
											<p className="text">{v.text}</p>
										</div>
									)}
								</div>
							)
						})}
					</div>
				</div>
			</div>
		</div>
	)
}
