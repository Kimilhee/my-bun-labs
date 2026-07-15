import { useEffect, useRef, useState } from 'react'
import type { Action } from '../lib/app-state'
import { mustVerse } from '../lib/data'
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
						{voice.status === 'recording' && (
							<span className="note recording-note">
								● 듣는 중 — 첫머리를 암송하세요
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
					<button
						type="button"
						className="list-handle"
						onClick={() => setListOpen(true)}
					>
						≡ 지나온 구절
					</button>
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
								className={`btn ${voice.status === 'recording' ? 'recording' : ''}`}
								onClick={() =>
									voice.status === 'recording' ? stopVoice() : startVoice()
								}
							>
								🎤 {voice.status === 'recording' ? '중지' : '첫머리 암송'}
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

			{voice.status === 'pass' && (
				<div className="pass-overlay">
					<div className="pass-circle">⭕</div>
				</div>
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
