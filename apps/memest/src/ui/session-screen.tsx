import {
	type TouchEvent as ReactTouchEvent,
	useEffect,
	useRef,
	useState,
} from 'react'
import type { Action } from '../lib/app-state'
import { mustVerse, parts } from '../lib/data'
import { hintLayers } from '../lib/hints'
import { firstPhraseMatch, followWords } from '../lib/match'
import {
	playPass,
	type RecognizerHandle,
	speechSupported,
	startRecognition,
} from '../lib/speech'
import type { AppData, Session } from '../lib/types'
import { PartScopeSheet } from './part-scope-sheet'
import { VerseListSheet } from './verse-list-sheet'

// 첫머리 음성 확인 상태 (전체 암송 채점 아님 — ADR-16)
type Voice =
	| { status: 'idle' }
	| { status: 'recording' }
	| { status: 'fail'; ratio: number }
	| { status: 'pass' }

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
	const [voice, setVoice] = useState<Voice>({ status: 'idle' })
	const recRef = useRef<RecognizerHandle | null>(null)
	const touchStart = useRef<{ x: number; y: number } | null>(null) // 스와이프 시작점
	const id = session.queue[0]
	const encounterKey = `${id}:${session.history.length}`

	// 카드가 바뀌면 (재큐잉으로 같은 카드가 다시 와도) 열린 어절·음성 상태 초기화
	// biome-ignore lint/correctness/useExhaustiveDependencies: encounterKey가 카드 전환 신호
	useEffect(() => {
		setRevealed(0)
		setVoice({ status: 'idle' })
		recRef.current?.cancel()
		recRef.current = null
	}, [encounterKey])

	if (!id) return null
	const verse = mustVerse(id)
	// 대제목: 파트 배지와 겹치지 않을 때만 (시리즈만 배지명과 다르다)
	const catalog = parts.find((p) => p.part === verse.part)
	const bigTitle =
		catalog && !verse.part.includes(catalog.title) ? catalog.title : null
	const layers = hintLayers(verse)
	const shown = layers.slice(0, session.hintsUsed)
	const hintsLeft = session.hintsUsed < layers.length
	const doneCount = session.history.length
	const total = doneCount + session.queue.length

	const words = followWords(verse.text)
	const revealEnd =
		revealed > 0 ? (words[Math.min(revealed, words.length) - 1]?.end ?? 0) : 0
	const revealOne = () => setRevealed((n) => Math.min(n + 1, words.length))

	const canSpeak = speechSupported()
	const startVoice = () => {
		if (voice.status === 'recording') return
		const handle = startRecognition(
			(t) => {
				// 첫머리가 맞은 순간 바로 종료 → 통과 처리
				if (firstPhraseMatch(verse.text, t).pass) recRef.current?.stop()
			},
			(finalT) => {
				recRef.current = null
				if (!finalT.trim()) {
					setVoice({ status: 'idle' }) // 말 없이 뗐으면 조용히 복귀
					return
				}
				const m = firstPhraseMatch(verse.text, finalT)
				if (m.pass) {
					playPass()
					setVoice({ status: 'pass' })
					// ⭕만 잠깐 보여주고 전체 말씀 화면으로 (자동으로 다음 카드로 넘어가지 않음)
					window.setTimeout(() => {
						setVoice({ status: 'idle' })
						dispatch({ type: 'recalled' })
					}, 900)
				} else setVoice({ status: 'fail', ratio: m.ratio })
			},
			() => setVoice({ status: 'idle' }),
		)
		if (handle) {
			recRef.current = handle
			setVoice({ status: 'recording' })
		}
	}
	const stopVoice = () => recRef.current?.stop()

	// 본문 좌우 스와이프: ← 다음 / → 직전 구절 다시
	const onTouchStart = (e: ReactTouchEvent) => {
		const t = e.touches[0]
		touchStart.current = t ? { x: t.clientX, y: t.clientY } : null
	}
	const swipeDir = (e: ReactTouchEvent): 'left' | 'right' | null => {
		const start = touchStart.current
		touchStart.current = null
		const t = e.changedTouches[0]
		if (!start || !t) return null
		const dx = t.clientX - start.x
		const dy = t.clientY - start.y
		// 세로 스크롤과 구분: 가로 이동이 충분히 크고 지배적일 때만
		if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 2) return null
		return dx < 0 ? 'left' : 'right'
	}
	const prevId = [...session.history]
		.reverse()
		.find((e) => e.verseId !== id)?.verseId
	const onAnswerSwipe = (e: ReactTouchEvent) => {
		const dir = swipeDir(e)
		if (dir === 'left') dispatch({ type: 'next', wrong: false })
		else if (dir === 'right' && prevId)
			dispatch({ type: 'redoVerse', verseId: prevId })
	}
	const onCueSwipe = (e: ReactTouchEvent) => {
		const dir = swipeDir(e)
		if (dir === 'left')
			dispatch({ type: 'skip' }) // 채점 없이 큐 뒤로
		else if (dir === 'right' && prevId)
			dispatch({ type: 'redoVerse', verseId: prevId })
	}

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
						onTouchStart={onTouchStart}
						onTouchEnd={onCueSwipe}
					>
						{(bigTitle || verse.midTitle) && (
							<span className="cue-titles">
								{bigTitle && <span className="cue-big">{bigTitle}</span>}
								{verse.midTitle && (
									<span className="cue-mid">{verse.midTitle}</span>
								)}
							</span>
						)}
						<span className="ref">{verse.ref}</span>
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
						{voice.status === 'recording' && (
							<span className="note recording-note">
								● 듣는 중 — 누른 채 첫머리를 암송하고, 떼면 바로 평가해요
							</span>
						)}
						{voice.status === 'fail' && (
							<span className="note fail-note">
								일치 {Math.round(voice.ratio * 100)}% — 50% 이상이면 통과예요.
								다시 시도!
							</span>
						)}
						<span className="note">
							두 번 터치 = 다음 어절 열기
							{revealed > 0 && ` (${revealed}/${words.length})`}
						</span>
					</button>
					<div className="bottom">
						<div className={`actions ${canSpeak ? 'three' : ''}`}>
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
							{canSpeak && (
								<button
									type="button"
									className={`btn hold ${voice.status === 'recording' ? 'recording' : ''}`}
									onPointerDown={startVoice}
									onPointerUp={stopVoice}
									onPointerLeave={stopVoice}
									onPointerCancel={stopVoice}
									onContextMenu={(e) => e.preventDefault()}
								>
									{voice.status === 'recording'
										? '● 듣는 중'
										: '🎤 첫머리 암송'}
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
						<button
							type="button"
							className="list-handle"
							onClick={() => setListOpen(true)}
						>
							≡ 지나온 구절
						</button>
					</div>
				</>
			) : (
				<>
					<div
						className="answer"
						onTouchStart={onTouchStart}
						onTouchEnd={onAnswerSwipe}
					>
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
					<div className="bottom">
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
						<button
							type="button"
							className="list-handle"
							onClick={() => setListOpen(true)}
						>
							≡ 지나온 구절
						</button>
					</div>
				</>
			)}

			{voice.status === 'pass' && (
				<div className="pass-overlay">
					<div className="pass-circle">⭕</div>
				</div>
			)}

			{listOpen && (
				<VerseListSheet
					data={data}
					session={session}
					onPick={(verseId, showAnswer) => {
						dispatch({ type: 'redoVerse', verseId, showAnswer })
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
