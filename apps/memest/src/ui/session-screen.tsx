import { useEffect, useState } from 'react'
import type { Action } from '../lib/app-state'
import { mustVerse } from '../lib/data'
import { hintLayers } from '../lib/hints'
import { followWords } from '../lib/match'
import type { AppData, Session } from '../lib/types'
import { PartScopeSheet } from './part-scope-sheet'
import { VerseListSheet } from './verse-list-sheet'

type Props = {
	data: AppData
	session: Session
	dispatch: (a: Action) => void
	onSettings: () => void
}

export function SessionScreen({ data, session, dispatch, onSettings }: Props) {
	const [listOpen, setListOpen] = useState(false)
	const [scopeOpen, setScopeOpen] = useState(false)
	const [revealed, setRevealed] = useState(0) // 더블탭으로 연 어절 수
	const id = session.queue[0]
	const encounterKey = `${id}:${session.history.length}`

	// 카드가 바뀌면 (재큐잉으로 같은 카드가 다시 와도) 열린 어절 초기화
	// biome-ignore lint/correctness/useExhaustiveDependencies: encounterKey가 카드 전환 신호
	useEffect(() => setRevealed(0), [encounterKey])

	if (!id) return null
	const verse = mustVerse(id)
	const level = data.progress[id]?.level // undefined = 미진단 → C 형태로 제시
	const layers = hintLayers(verse, level)
	const shown = layers.slice(0, session.hintsUsed)
	const hintsLeft = session.hintsUsed < layers.length
	const doneCount = session.history.length
	const total = doneCount + session.queue.length

	const words = followWords(verse.text)
	const revealEnd =
		revealed > 0 ? (words[Math.min(revealed, words.length) - 1]?.end ?? 0) : 0
	const revealOne = () => setRevealed((n) => Math.min(n + 1, words.length))

	return (
		<div className="screen">
			<div className="top">
				<button
					type="button"
					className="badge badge-btn"
					onClick={() => setScopeOpen(true)}
				>
					{verse.part} ▾
				</button>
				<span className="progress-label">
					{doneCount + 1}/{total}
				</span>
				<span className="spacer" />
				<button
					type="button"
					className="icon-btn"
					onClick={onSettings}
					aria-label="설정"
				>
					⚙
				</button>
			</div>

			{session.stage === 'cue' ? (
				<>
					<button
						type="button"
						className="cue follow-area"
						onDoubleClick={revealOne}
					>
						<span className="ref">{verse.ref}</span>
						{level !== 'D' && (
							<span className="cue-title">
								{verse.midTitle && (
									<span className="mid">{verse.midTitle} · </span>
								)}
								{verse.title}
							</span>
						)}
						{shown.map((h) => (
							<span className="hint-row" key={h.label}>
								<span className="hint-label">{h.label}</span>
								<span className="hint-content">{h.content}</span>
							</span>
						))}
						{revealed > 0 && (
							<span className="text follow-text">
								{verse.text.slice(0, revealEnd)}
							</span>
						)}
						<span className="note">
							두 번 터치 = 다음 어절 열기
							{revealed > 0 && ` (${revealed}/${words.length})`}
						</span>
					</button>
					<button
						type="button"
						className="list-handle"
						onClick={() => setListOpen(true)}
					>
						≡ 지나온 구절
					</button>
					<div className="actions">
						{hintsLeft ? (
							<button
								type="button"
								className="btn"
								onClick={() => dispatch({ type: 'hint' })}
							>
								힌트 {session.hintsUsed}/{layers.length}
							</button>
						) : (
							<button
								type="button"
								className="btn"
								onClick={() => dispatch({ type: 'reveal' })}
							>
								정답 보기
							</button>
						)}
						<button
							type="button"
							className="btn primary"
							onClick={() => dispatch({ type: 'recalled' })}
						>
							말씀 확인
						</button>
					</div>
				</>
			) : (
				<>
					<div className="answer">
						<div className="hierarchy">
							{verse.part}
							{verse.midTitle ? ` › ${verse.midTitle}` : ''} ›{' '}
							<b>{verse.title}</b>
							{verse.starred && ' ⭐'}
						</div>
						<div className="ref">{verse.ref}</div>
						<p className="text">{verse.text}</p>
						{verse.note && <p className="note">메모: {verse.note}</p>}
						{session.revealed && (
							<p className="revealed-tag">정답 확인 — 읽고 다시 만나요</p>
						)}
					</div>
					<button
						type="button"
						className="list-handle"
						onClick={() => setListOpen(true)}
					>
						≡ 지나온 구절
					</button>
					<div className={`actions ${!session.revealed ? 'three' : ''}`}>
						{!session.revealed && (
							<button
								type="button"
								className="btn"
								onClick={() => dispatch({ type: 'backToCue' })}
							>
								다시하기
							</button>
						)}
						{!session.revealed ? (
							<button
								type="button"
								className="btn"
								onClick={() => dispatch({ type: 'next', wrong: true })}
							>
								잘못 떠올림
							</button>
						) : (
							<span />
						)}
						<button
							type="button"
							className="btn primary"
							onClick={() => dispatch({ type: 'next', wrong: false })}
						>
							다음
						</button>
					</div>
				</>
			)}

			{listOpen && (
				<VerseListSheet
					data={data}
					session={session}
					onRedo={(verseId) => {
						dispatch({ type: 'redoVerse', verseId })
						setListOpen(false)
					}}
					onClose={() => setListOpen(false)}
				/>
			)}
			{scopeOpen && (
				<PartScopeSheet
					scope={data.settings.scopeParts}
					onChange={(codes) => dispatch({ type: 'setScopeParts', codes })}
					onClose={() => setScopeOpen(false)}
				/>
			)}
		</div>
	)
}
