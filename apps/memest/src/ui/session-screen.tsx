import {
	type ReactNode,
	type TouchEvent as ReactTouchEvent,
	useEffect,
	useRef,
	useState,
} from 'react'
import type { Action } from '../lib/app-state'
import { isStarred, mustVerse, parts } from '../lib/data'
import { hintLayers } from '../lib/hints'
import { firstPhraseMatch, followWords } from '../lib/match'
import { sessionVerseIds } from '../lib/session'
import {
	playPass,
	type RecognizerHandle,
	speechSupported,
	startRecognition,
} from '../lib/speech'
import type { AppData, Session } from '../lib/types'
import { type TitleScope, VerseListSheet } from './verse-list-sheet'

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

/** 제목 탭만 가로채고 나머지 제스처(더블탭·스와이프)는 단서 영역으로 흘려보낸다 */
function TitleTapSpan({
	className,
	onOpen,
	children,
}: {
	className: string
	onOpen: () => void
	children: ReactNode
}) {
	return (
		<button
			type="button"
			className={`${className} title-link`}
			onClick={(e) => {
				e.stopPropagation()
				onOpen()
			}}
			onDoubleClick={(e) => e.stopPropagation()}
		>
			{children}
		</button>
	)
}

export function SessionScreen({ data, session, dispatch, onSettings }: Props) {
	const [listOpen, setListOpen] = useState(false)
	const [titleScope, setTitleScope] = useState<TitleScope | null>(null)
	const [voice, setVoice] = useState<Voice>({ status: 'idle' })
	const recRef = useRef<RecognizerHandle | null>(null)
	const touchStart = useRef<{
		x: number
		y: number
		locked: 'h' | 'v' | null // 첫 움직임에서 가로/세로 잠금
	} | null>(null)
	const slideRef = useRef<HTMLElement | null>(null) // 스와이프로 움직이는 카드 영역
	const enterFrom = useRef<'left' | 'right' | null>(null) // 다음 카드의 진입 방향
	const id = session.queue[0]
	const encounterKey = `${id}:${session.history.length}`

	// 카드가 바뀌면 (재큐잉으로 같은 카드가 다시 와도) 음성 상태 초기화
	// (열린 어절 수는 세션 상태라 리듀서의 freshCard가 되돌린다)
	// biome-ignore lint/correctness/useExhaustiveDependencies: encounterKey가 카드 전환 신호
	useEffect(() => {
		setVoice({ status: 'idle' })
		recRef.current?.cancel()
		recRef.current = null
		// 스와이프로 넘어왔으면 새 카드를 반대편에서 슬라이드 인
		const el = slideRef.current
		const from = enterFrom.current
		enterFrom.current = null
		if (!el) return
		if (from) {
			const w = el.clientWidth || window.innerWidth
			el.style.transition = 'none'
			el.style.transform = `translate3d(${from === 'right' ? w : -w}px,0,0)`
			requestAnimationFrame(() =>
				requestAnimationFrame(() => {
					el.style.transition = 'transform 0.24s cubic-bezier(0.2, 0.8, 0.3, 1)'
					el.style.transform = 'translate3d(0,0,0)'
				}),
			)
		} else {
			el.style.transition = 'none'
			el.style.transform = ''
		}
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
	// 재큐잉으로 분모가 늘어나므로 실질 남은 수(현재 카드 제외)를 따로 보여준다
	const remaining = total - doneCount - 1
	// 하드드릴 세션에서만 부채를 보여준다 (매일 복습은 점수를 매기지 않는다)
	const debt = session.mode === 'drill' ? (data.drill[id] ?? 0) : 0
	// 정답 화면 하단 기호: ⊗ 총 틀린 횟수(모드 무관 누적) · ⊖ 남은 부채 · ⟳ 졸업까지 무결점 횟수
	const wrongCount = data.stats[id]?.wrong ?? 0
	const marks = [
		wrongCount ? `⊗ ${wrongCount}` : null,
		debt < 0 ? `⊖ ${-debt}` : null,
		debt < 0 ? `⟳ ${Math.ceil(-debt / 10)}` : null,
	]
		.filter(Boolean)
		.join(' · ')

	const words = followWords(verse.text)
	// 더블탭으로 연 어절 수 — 세션 상태에 두어야 하드드릴 감점(-3/어절)에 반영된다
	const revealed = session.revealedWords ?? 0
	const revealEnd =
		revealed > 0 ? (words[Math.min(revealed, words.length) - 1]?.end ?? 0) : 0
	const revealOne = () => {
		if (revealed < words.length) dispatch({ type: 'revealWord' })
	}

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

	// 좌우 스와이프 = 복습 구절 리스트 순서 브라우징: ← 리스트의 다음 구절 / → 이전 구절.
	// 이미 복습한 구절은 전문이 열린 채로(채점 제외 — peeked), 아니면 단서부터.
	// 손가락을 따라 카드가 움직이고(translate3d — GPU 합성), 임계값을 넘기면
	// 화면 밖으로 슬라이드 아웃 → 새 카드가 반대편에서 슬라이드 인. 못 넘기면 스냅백.
	const scopeList = sessionVerseIds(session)
	const scopeIdx = scopeList.indexOf(id)
	const nextInList = scopeIdx >= 0 ? scopeList[scopeIdx + 1] : undefined
	const prevInList = scopeIdx > 0 ? scopeList[scopeIdx - 1] : undefined
	const canRight = Boolean(prevInList)
	const canLeft = Boolean(nextInList)
	const doneNow = new Set(session.history.map((e) => e.verseId))
	const queuedSet = new Set(session.queue)
	// 지나온 구절 리스트와 같은 공개 규칙: 이번 세션에 확인했거나, 이전에 다뤘고 대기 중 아님
	const browseOpen = (vid: string) =>
		doneNow.has(vid) || Boolean(data.seen[vid] && !queuedSet.has(vid))
	const onTouchStart = (e: ReactTouchEvent) => {
		const t = e.touches[0]
		touchStart.current = t ? { x: t.clientX, y: t.clientY, locked: null } : null
	}
	const onTouchMove = (e: ReactTouchEvent) => {
		const d = touchStart.current
		const el = slideRef.current
		const t = e.touches[0]
		if (!d || !t || !el) return
		const dx = t.clientX - d.x
		const dy = t.clientY - d.y
		if (!d.locked) {
			// 첫 유의미한 움직임에서 방향 고정 — 세로면 스크롤에 양보
			if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return
			d.locked = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v'
		}
		if (d.locked !== 'h') return
		const allowed = dx < 0 ? canLeft : canRight
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
		const allowed =
			dir === 'left' ? canLeft : dir === 'right' ? canRight : false
		if (!dir || !allowed) {
			el.style.transition = 'transform 0.2s cubic-bezier(0.2, 0.8, 0.3, 1)'
			el.style.transform = 'translate3d(0,0,0)'
			return
		}
		const w = el.clientWidth || window.innerWidth
		el.style.transition = 'transform 0.18s ease-in'
		el.style.transform = `translate3d(${dir === 'left' ? -w : w}px,0,0)`
		const target = dir === 'left' ? nextInList : prevInList
		window.setTimeout(() => {
			if (!target) return
			enterFrom.current = dir === 'left' ? 'right' : 'left'
			dispatch({
				type: 'redoVerse',
				verseId: target,
				showAnswer: browseOpen(target),
			})
		}, 180)
	}

	return (
		<div className="screen">
			<div className="top">
				<button
					type="button"
					className="badge badge-btn"
					onClick={() => setTitleScope({ part: verse.part, midTitle: null })}
				>
					{verse.part} ▾
				</button>
				<span className="progress-label">
					{doneCount + 1}/{total} ({remaining})
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
					{/* 버튼이 아니라 div — 안에 제목 탭 버튼이 들어가므로 중첩을 피한다.
					    더블탭·스와이프는 제스처라 키보드 대응 대상이 아니다. */}
					<section
						aria-label="단서 — 두 번 터치하면 다음 어절"
						className="cue follow-area"
						ref={(el) => {
							slideRef.current = el
						}}
						onDoubleClick={revealOne}
						onTouchStart={onTouchStart}
						onTouchMove={onTouchMove}
						onTouchEnd={onSwipeEnd}
						onTouchCancel={onSwipeEnd}
					>
						{(bigTitle || verse.midTitle) && (
							<span className="cue-titles">
								{bigTitle && (
									<TitleTapSpan
										className="cue-big"
										onOpen={() =>
											setTitleScope({ part: verse.part, midTitle: null })
										}
									>
										{bigTitle}
									</TitleTapSpan>
								)}
								{verse.midTitle && (
									<TitleTapSpan
										className="cue-mid"
										onOpen={() =>
											setTitleScope({
												part: verse.part,
												midTitle: verse.midTitle,
											})
										}
									>
										{verse.midTitle}
									</TitleTapSpan>
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
					</section>
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
						ref={(el) => {
							slideRef.current = el
						}}
						onTouchStart={onTouchStart}
						onTouchMove={onTouchMove}
						onTouchEnd={onSwipeEnd}
						onTouchCancel={onSwipeEnd}
					>
						<div className="hierarchy">
							<button
								type="button"
								className="title-link"
								onClick={() =>
									setTitleScope({ part: verse.part, midTitle: null })
								}
							>
								{verse.part}
							</button>
							{verse.midTitle && (
								<>
									<span className="hierarchy-sep">›</span>
									<button
										type="button"
										className="title-link"
										onClick={() =>
											setTitleScope({
												part: verse.part,
												midTitle: verse.midTitle,
											})
										}
									>
										{verse.midTitle}
									</button>
								</>
							)}
						</div>
						<div className="sub-title">{verse.title}</div>
						{/* 장절 더블탭 = 별표 토글 (제스처라 키보드 대응 대상이 아니다) */}
						<button
							type="button"
							className="ref ref-star"
							aria-label="장절 — 두 번 터치하면 별표"
							onDoubleClick={() =>
								dispatch({ type: 'toggleStar', verseId: id })
							}
						>
							{verse.ref}
							{isStarred(data.stars, verse) && (
								<span className="star-on"> ⭐</span>
							)}
						</button>
						<p className="text">{verse.text}</p>
						{verse.note && <p className="note">메모: {verse.note}</p>}
						{/* 본문 밑 오른쪽에 기호만: ✗ 총 틀린 횟수 · 남은 부채 */}
						{marks && <div className="debt-note">{marks}</div>}
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
					onToggleFull={(on) => dispatch({ type: 'setListFull', on })}
					onClose={() => setListOpen(false)}
				/>
			)}
			{titleScope && (
				<VerseListSheet
					data={data}
					session={session}
					titleScope={titleScope}
					onPick={(verseId, showAnswer) => {
						dispatch({ type: 'redoVerse', verseId, showAnswer })
						setTitleScope(null)
					}}
					onToggleFull={(on) => dispatch({ type: 'setListFull', on })}
					onScopeChange={setTitleScope}
					onClose={() => setTitleScope(null)}
				/>
			)}
		</div>
	)
}
