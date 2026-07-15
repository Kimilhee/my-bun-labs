import { useEffect, useRef, useState } from 'react'
import type { Action } from '../lib/app-state'
import { mustVerse } from '../lib/data'
import { hintLayers } from '../lib/hints'
import { followProgress, followWords } from '../lib/match'
import {
	playPass,
	type RecognizerHandle,
	speechSupported,
	startRecognition,
} from '../lib/speech'
import type { AppData, Session } from '../lib/types'
import { PartScopeSheet } from './part-scope-sheet'
import { VerseListSheet } from './verse-list-sheet'

type Props = {
	data: AppData
	session: Session
	dispatch: (a: Action) => void
	onSettings: () => void
}

// 따라 열림 암송 상태: 음성이 도달한 만큼 본문을 공개하고,
// 두 번 터치로 한 어절씩 수동 공개(manual)할 수 있다.
type Recite =
	| { status: 'idle' }
	| { status: 'recording'; revealed: number; manual: number }
	| { status: 'result'; revealed: number; manual: number }

export function SessionScreen({ data, session, dispatch, onSettings }: Props) {
	const [listOpen, setListOpen] = useState(false)
	const [scopeOpen, setScopeOpen] = useState(false)
	const [recite, setRecite] = useState<Recite>({ status: 'idle' })
	const reciteRef = useRef(recite)
	reciteRef.current = recite
	const recRef = useRef<RecognizerHandle | null>(null)
	const id = session.queue[0]
	const encounterKey = `${id}:${session.history.length}`

	// 카드가 바뀌면 (재큐잉으로 같은 카드가 다시 와도) 암송 상태 초기화
	// biome-ignore lint/correctness/useExhaustiveDependencies: encounterKey가 카드 전환 신호
	useEffect(() => {
		setRecite({ status: 'idle' })
		recRef.current?.cancel() // 진행 중 인식은 채점 없이 폐기
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
	const voiceOn = speechSupported() && data.settings.voiceRecitation

	const words = followWords(verse.text, data.settings.firstPhraseMode)
	const scopeEnd = words[words.length - 1]?.end ?? verse.text.length
	const revealEnd = (n: number) =>
		n > 0 ? (words[Math.min(n, words.length) - 1]?.end ?? 0) : 0

	const startRecite = () => {
		if (recite.status === 'recording') return
		const autoAdvance = data.settings.autoAdvance
		const handle = startRecognition(
			(t) => {
				const matched = followProgress(words, t)
				setRecite((prev) =>
					prev.status === 'recording'
						? { ...prev, revealed: Math.max(prev.revealed, matched) }
						: prev,
				)
				// 끝까지 열렸으면 기다리지 않고 즉시 인식 종료 → 자동 채점
				if (matched >= words.length) recRef.current?.stop()
			},
			(finalT) => {
				recRef.current = null
				const prev = reciteRef.current
				const base =
					prev.status === 'recording' ? prev : { revealed: 0, manual: 0 }
				const revealed = Math.max(base.revealed, followProgress(words, finalT))
				setRecite({ status: 'result', revealed, manual: base.manual })
				if (revealed >= words.length) {
					playPass()
					if (base.manual === 0 && autoAdvance)
						window.setTimeout(
							() => dispatch({ type: 'next', wrong: false }),
							1100,
						)
				}
			},
			() => setRecite({ status: 'idle' }),
		)
		if (handle) {
			recRef.current = handle
			setRecite({ status: 'recording', revealed: 0, manual: 0 })
		}
	}
	const stopRecite = () => recRef.current?.stop()
	const revealOne = () =>
		setRecite((prev) =>
			prev.status === 'recording'
				? {
						...prev,
						revealed: Math.min(prev.revealed + 1, words.length),
						manual: prev.manual + 1,
					}
				: prev,
		)

	const resultComplete =
		recite.status === 'result' && recite.revealed >= words.length
	const passOverlay =
		recite.status === 'result' &&
		resultComplete &&
		recite.manual === 0 &&
		data.settings.autoAdvance
	const panelResult = recite.status === 'result' && !passOverlay ? recite : null

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
				panelResult ? (
					<>
						<div className="answer">
							<div className="hierarchy">
								{verse.midTitle ? `${verse.midTitle} › ` : ''}
								<b>{verse.title}</b>
							</div>
							<div className="ref">{verse.ref}</div>
							<p className="text">
								{verse.text.slice(0, revealEnd(panelResult.revealed))}
								{!resultComplete && (
									<mark className="miss">
										{verse.text.slice(
											revealEnd(panelResult.revealed),
											scopeEnd,
										)}
									</mark>
								)}
								{verse.text.slice(scopeEnd)}
							</p>
							<p className="note">
								{panelResult.revealed}/{words.length} 어절
								{panelResult.manual > 0 &&
									` · 직접 연 어절 ${panelResult.manual}개`}
								{resultComplete && ' · 완주 ✅'}
							</p>
						</div>
						<button
							type="button"
							className="list-handle"
							onClick={() => setListOpen(true)}
						>
							≡ 지나온 구절
						</button>
						<div className="actions three">
							<button
								type="button"
								className="btn"
								onClick={() => setRecite({ status: 'idle' })}
							>
								다시 암송
							</button>
							<button
								type="button"
								className="btn"
								onClick={() => dispatch({ type: 'next', wrong: true })}
							>
								틀렸음
							</button>
							<button
								type="button"
								className="btn primary"
								onClick={() => dispatch({ type: 'next', wrong: false })}
							>
								{resultComplete ? '다음' : '맞은 걸로'}
							</button>
						</div>
					</>
				) : recite.status === 'recording' ? (
					<>
						<button
							type="button"
							className="cue follow-area"
							onDoubleClick={revealOne}
						>
							<span className="ref">{verse.ref}</span>
							<span className="text follow-text">
								{verse.text.slice(0, revealEnd(recite.revealed))}
								<span className="follow-cursor">▏</span>
							</span>
							<span className="note">
								암송하면 본문이 따라 열립니다 · 두 번 터치 = 한 어절 열기
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
							<span />
							<button
								type="button"
								className="btn primary recording"
								onClick={stopRecite}
							>
								🎤 탭하여 채점
							</button>
						</div>
					</>
				) : (
					<>
						<div className="cue">
							<div className="ref">{verse.ref}</div>
							{level !== 'D' && (
								<div className="cue-title">
									{verse.midTitle && (
										<span className="mid">{verse.midTitle} · </span>
									)}
									{verse.title}
								</div>
							)}
							{shown.map((h) => (
								<div className="hint-row" key={h.label}>
									<span className="hint-label">{h.label}</span>
									<span className="hint-content">{h.content}</span>
								</div>
							))}
						</div>
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
							{voiceOn ? (
								<button
									type="button"
									className="btn primary"
									onClick={startRecite}
								>
									🎤 암송 시작
								</button>
							) : (
								<button
									type="button"
									className="btn primary"
									onClick={() => dispatch({ type: 'recalled' })}
								>
									말씀 확인
								</button>
							)}
						</div>
						{voiceOn && (
							<button
								type="button"
								className="link-btn"
								onClick={() => dispatch({ type: 'recalled' })}
							>
								말 없이 눈으로 확인하기
							</button>
						)}
					</>
				)
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

			{passOverlay && (
				<div className="pass-overlay">
					<div className="pass-circle">⭕</div>
					<div className="pass-title">{verse.title}</div>
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
