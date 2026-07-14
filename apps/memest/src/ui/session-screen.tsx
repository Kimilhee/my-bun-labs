import { useEffect, useRef, useState } from 'react'
import type { Action } from '../lib/app-state'
import { mustVerse } from '../lib/data'
import { hintLayers } from '../lib/hints'
import { type Grade, gradeRecitation } from '../lib/match'
import {
	playPass,
	type RecognizerHandle,
	speechSupported,
	startRecognition,
} from '../lib/speech'
import type { AppData, Session } from '../lib/types'
import { VerseListSheet } from './verse-list-sheet'

type Props = {
	data: AppData
	session: Session
	dispatch: (a: Action) => void
	onSettings: () => void
}

type Recite =
	| { status: 'idle' }
	| { status: 'recording'; transcript: string }
	| { status: 'result'; transcript: string; grade: Grade }

/** 대조 결과: 못 맞춘 글자를 하이라이트해서 본문 표시 */
function DiffText({ text, miss }: { text: string; miss: Set<number> }) {
	const segs: { t: string; miss: boolean }[] = []
	for (let i = 0; i < text.length; i++) {
		const ch = text[i] ?? ''
		const m = miss.has(i)
		const last = segs[segs.length - 1]
		if (last && last.miss === m) last.t += ch
		else segs.push({ t: ch, miss: m })
	}
	let offset = 0
	return (
		<p className="text">
			{segs.map((s) => {
				const key = offset
				offset += s.t.length
				return s.miss ? (
					<mark key={key} className="miss">
						{s.t}
					</mark>
				) : (
					<span key={key}>{s.t}</span>
				)
			})}
		</p>
	)
}

export function SessionScreen({ data, session, dispatch, onSettings }: Props) {
	const [listOpen, setListOpen] = useState(false)
	const [recite, setRecite] = useState<Recite>({ status: 'idle' })
	const recRef = useRef<RecognizerHandle | null>(null)
	const id = session.queue[0]
	const encounterKey = `${id}:${session.history.length}`

	// 카드가 바뀌면 (재큐잉으로 같은 카드가 다시 와도) 암송 상태 초기화
	// biome-ignore lint/correctness/useExhaustiveDependencies: encounterKey가 카드 전환 신호
	useEffect(() => {
		setRecite({ status: 'idle' })
		recRef.current?.stop()
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

	const startRecite = () => {
		if (recite.status === 'recording') return
		const firstPhrase = data.settings.firstPhraseMode
		const handle = startRecognition(
			(t) => setRecite({ status: 'recording', transcript: t }),
			(finalT) => {
				recRef.current = null
				const grade = gradeRecitation(verse.text, finalT, firstPhrase)
				setRecite({ status: 'result', transcript: finalT, grade })
				if (grade.pass) {
					playPass()
					// 완벽 일치일 때만 자동 진행. 조금이라도 다르면 대조 화면에서 확인.
					// (옛말 어절은 50%만 넘으면 완벽으로 취급 — STT가 옛말을 잘 못 받아적음)
					if (grade.perfect) {
						window.setTimeout(
							() => dispatch({ type: 'next', wrong: false }),
							1100,
						)
					}
				}
			},
			() => setRecite({ status: 'idle' }),
		)
		if (handle) {
			recRef.current = handle
			setRecite({ status: 'recording', transcript: '' })
		}
	}
	const stopRecite = () => recRef.current?.stop()

	const panelResult =
		recite.status === 'result' && !recite.grade.perfect ? recite : null
	const passResult =
		recite.status === 'result' && recite.grade.perfect ? recite : null

	return (
		<div className="screen">
			<div className="top">
				<span className="badge">{verse.part}</span>
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
							<DiffText
								text={verse.text}
								miss={panelResult.grade.missIndices}
							/>
							<p className="transcript">
								🎤{' '}
								{panelResult.grade.spokenSegs.length === 0
									? '(음성이 인식되지 않았어요)'
									: (() => {
											let offset = 0
											return panelResult.grade.spokenSegs.map((s) => {
												const key = offset
												offset += s.text.length
												if (s.kind === 'miss')
													return (
														<mark key={key} className="miss">
															{s.text}
														</mark>
													)
												if (s.kind === 'fixed')
													return (
														<span key={key} className="fixed">
															{s.text}
														</span>
													)
												return <span key={key}>{s.text}</span>
											})
										})()}
							</p>
							<p className="note">
								일치율 {Math.round(panelResult.grade.similarity * 100)}%
								{panelResult.grade.pass && ' · 통과 기준은 넘었어요'}
							</p>
						</div>
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
								{panelResult.grade.pass ? '다음' : '맞은 걸로'}
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
							{recite.status === 'recording' && (
								<div className="recite-live">
									<span className="rec-dot" /> 듣는 중…
									{recite.transcript && (
										<div className="transcript">{recite.transcript}</div>
									)}
								</div>
							)}
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
									className={`btn primary ${recite.status === 'recording' ? 'recording' : ''}`}
									onClick={() =>
										recite.status === 'recording' ? stopRecite() : startRecite()
									}
								>
									🎤{' '}
									{recite.status === 'recording' ? '탭하여 채점' : '암송 시작'}
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

			{passResult && (
				<div className="pass-overlay">
					<div className="pass-circle">⭕</div>
					<div className="pass-title">{verse.title}</div>
				</div>
			)}

			{listOpen && (
				<VerseListSheet session={session} onClose={() => setListOpen(false)} />
			)}
		</div>
	)
}
