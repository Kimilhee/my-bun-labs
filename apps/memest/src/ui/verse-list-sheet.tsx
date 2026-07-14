import { useState } from 'react'
import { verses } from '../lib/data'
import { opening } from '../lib/hints'
import type { Session, Verse } from '../lib/types'

type Props = { session: Session; onClose: () => void }

/**
 * 복습 범위 구절 리스트 (바텀시트).
 * 스포일러 방지: 이번 세션에서 이미 확인한 카드만 제목·첫머리 노출, 나머지는 장절만.
 */
export function VerseListSheet({ session, onClose }: Props) {
	const [full, setFull] = useState(false)
	const [expandedId, setExpandedId] = useState<string | null>(null)

	const sessionIds = new Set([
		...session.history.map((e) => e.verseId),
		...session.queue,
	])
	const scope: Verse[] = session.scopeCodes
		? verses.filter((v) =>
				session.scopeCodes?.some((c) => v.id.startsWith(`${c}-`)),
			)
		: verses.filter((v) => sessionIds.has(v.id))
	const doneIds = new Set(session.history.map((e) => e.verseId))
	const currentId = session.queue[0]

	let lastPart = ''
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
					<b>복습 구절</b>
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
					{scope.map((v) => {
						const header = v.part !== lastPart ? v.part : null
						lastPart = v.part
						const isDone = doneIds.has(v.id)
						const isCurrent = v.id === currentId
						return (
							<div key={v.id}>
								{header && <div className="list-part-header">{header}</div>}
								<button
									type="button"
									className={`list-row ${isCurrent ? 'current' : ''}`}
									onClick={() =>
										isDone && setExpandedId(expandedId === v.id ? null : v.id)
									}
								>
									<span className="list-ref">{v.ref}</span>
									{isCurrent && <span className="now-tag">지금</span>}
									{isDone && !isCurrent && (
										<span className="list-preview">
											{v.title} — {opening(v.text, 20)}
										</span>
									)}
								</button>
								{expandedId === v.id && isDone && (
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
