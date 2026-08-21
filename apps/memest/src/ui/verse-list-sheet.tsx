import { useState } from 'react'
import { verses } from '../lib/data'
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
	onClose: () => void
}

/**
 * 구절 리스트 (바텀시트). 기본은 복습 범위 전체, titleScope가 오면 그 제목 범위.
 * 스포일러 방지: 이번 세션에서 확인했거나 이전 세션에서 다뤘던 카드만 제목·첫머리를
 * 노출하고, 현재 카드와 이번 세션에서 아직 안 나온 대기 카드는 장절만 보여준다.
 */
export function VerseListSheet({
	data,
	session,
	titleScope,
	onPick,
	onClose,
}: Props) {
	const [full, setFull] = useState(false)
	const [expandedId, setExpandedId] = useState<string | null>(null)

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
						onClick={() => setFull(!full)}
					>
						{full ? '반만' : '전체'}
					</button>
					<button type="button" className="icon-btn" onClick={onClose}>
						닫기
					</button>
				</div>
				<div className="sheet-list">
					{scope.map((v, i) => {
						// 기본은 파트로, 제목 범위에서는 중제목으로 묶는다
						const group = titleScope ? (v.midTitle ?? '') : v.part
						const header = group !== lastGroup ? group : null
						lastGroup = group
						const isCurrent = v.id === currentId
						// 이번 세션에서 확인했거나, 이전 세션에서 다뤘고 지금 대기열에 없는 카드만 공개
						const revealed =
							!isCurrent &&
							(doneNow.has(v.id) || (data.progress[v.id] && !queued.has(v.id)))
						return (
							<div key={v.id}>
								{header && <div className="list-part-header">{header}</div>}
								<div className={`list-row ${isCurrent ? 'current' : ''}`}>
									{titleScope && <span className="list-num">{i + 1}</span>}
									<button
										type="button"
										className="list-ref list-ref-btn"
										onClick={() => onPick(v.id, Boolean(revealed))}
										aria-label={`${v.ref} 선택`}
									>
										{v.ref}
									</button>
									<button
										type="button"
										className="list-row-main"
										onClick={() =>
											revealed &&
											setExpandedId(expandedId === v.id ? null : v.id)
										}
									>
										{isCurrent && <span className="now-tag">지금</span>}
										{revealed && (
											<span className="list-preview">
												{v.title} — {opening(v.text, 20)}
											</span>
										)}
									</button>
									{revealed && (
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
								{expandedId === v.id && revealed && (
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
