import { type TouchEvent as ReactTouchEvent, useRef, useState } from 'react'
import { parts, verses } from '../lib/data'
import { opening } from '../lib/hints'
import { inScope } from '../lib/session'
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
 * 구절 리스트 (바텀시트). 기본은 복습 범위 전체, titleScope가 오면 그 제목 범위.
 * 모든 구절의 제목·첫머리를 보여준다 (예전의 스포일러 가리기는 걷어냄 — 리스트는
 * 찾아보는 용도라 다 보이는 편이 쓸모 있다). 이미 다뤄본 구절인지(studied)는
 * 표시가 아니라 장절 탭의 동작(전문부터 vs 단서부터)에만 쓴다.
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
	const touchStart = useRef<{ x: number; y: number } | null>(null)

	/** 좌우 스와이프로 이전/다음 대제목 (제목 범위 리스트에서만) */
	const onTouchStart = (e: ReactTouchEvent) => {
		const t = e.touches[0]
		touchStart.current = t ? { x: t.clientX, y: t.clientY } : null
	}
	const onTouchEnd = (e: ReactTouchEvent) => {
		const d = touchStart.current
		const t = e.changedTouches[0]
		touchStart.current = null
		if (!d || !t || !titleScope || !onScopeChange) return
		const dx = t.clientX - d.x
		if (Math.abs(dx) < 60 || Math.abs(dx) <= Math.abs(t.clientY - d.y)) return
		const i = parts.findIndex((p) => p.part === titleScope.part)
		const next = parts[i + (dx < 0 ? 1 : -1)]
		if (next) onScopeChange({ part: next.part, midTitle: null })
	}

	const scopeCodes = session.scopeCodes ?? data.settings.scopeParts
	const scope = titleScope
		? verses.filter(
				(v) =>
					v.part === titleScope.part &&
					(titleScope.midTitle === null || v.midTitle === titleScope.midTitle),
			)
		: verses.filter((v) => inScope(v.id, scopeCodes))
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
							: '복습 구절'}
					</b>
					<span className="note">{scope.length}개</span>
					<span className="spacer" />
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
					onTouchStart={onTouchStart}
					onTouchEnd={onTouchEnd}
					onTouchCancel={onTouchEnd}
				>
					{scope.map((v, i) => {
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
							Boolean(data.progress[v.id] && !queued.has(v.id))
						return (
							<div key={v.id}>
								{header && <div className="list-part-header">{header}</div>}
								<div className={`list-row ${isCurrent ? 'current' : ''}`}>
									{titleScope && <span className="list-num">{i + 1}</span>}
									<button
										type="button"
										className="list-ref list-ref-btn"
										onClick={() => onPick(v.id, studied)}
										aria-label={`${v.ref} 선택`}
									>
										{v.ref}
									</button>
									<button
										type="button"
										className="list-row-main"
										onClick={() =>
											setExpandedId(expandedId === v.id ? null : v.id)
										}
									>
										{isCurrent && <span className="now-tag">지금 복습중</span>}
										<span className="list-preview">
											{v.title} — {opening(v.text, 20)}
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
	)
}
