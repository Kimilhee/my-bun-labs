import { useEffect, useRef, useState } from 'react'
import type { Action } from '../lib/app-state'
import { mustVerse } from '../lib/data'
import {
	afterMatch,
	debtOf,
	headPhrase,
	isFinished,
	isStale,
	scopeSig,
} from '../lib/pair-game'
import { scopeLabel } from '../lib/session'
import { speak, spokenRef } from '../lib/speech'
import type { AppData, PairGame } from '../lib/types'

type Props = {
	data: AppData
	game: PairGame
	dispatch: (a: Action) => void
	onHome: () => void
}

type Side = 'ref' | 'head'

/** 맞춘 짝 공개: 장절·제목만 중앙에 띄운다. 회색 카드였으면 각인 단계로 이어진다 */
type Reveal = {
	ref: string
	head: string
	title: string
	again: number | null // 남은 부채 (덱으로 되돌아가는 카드), 졸업했으면 null
}

/**
 * 짝 맞추기. 왼쪽 열이 장절, 오른쪽 열이 첫 소절이고 둘을 골라 맞추면 사라진다.
 * 진행은 리듀서(=localStorage)에 있고, 이 화면은 고른 타일·공개 연출만 로컬로 든다.
 */
export function PairGameScreen({ data, game, dispatch, onHome }: Props) {
	const [pick, setPick] = useState<{ side: Side; id: string } | null>(null)
	const [wrong, setWrong] = useState<string[]>([])
	// 각인 단계 도중에 나갔다 돌아오면 그 단계부터 복원한다 (리듀서에 review가 남아 있다)
	const [reveal, setReveal] = useState<Reveal | null>(() => {
		const rv = game.review
		if (!rv) return null
		const v = mustVerse(rv.verseId)
		const left = debtOf(game, rv.verseId)
		return {
			ref: v.ref,
			head: headPhrase(v.text),
			title: v.title,
			again: left < 0 ? left : null,
		}
	})
	const [split, setSplit] = useState(() => game.review !== null)
	// 연출이 겹칠 때 앞의 타이머가 새 연출을 지우지 않도록 하는 세대 번호
	const seq = useRef(0)

	const timers = useRef<number[]>([])
	const later = (fn: () => void, ms: number) => {
		timers.current.push(window.setTimeout(fn, ms))
	}
	useEffect(() => () => timers.current.forEach(clearTimeout), [])

	const best = data.pairBest[scopeSig(game.scope, game.starredOnly)]

	if (isFinished(game))
		return (
			<div className="screen center">
				<div className="summary">
					<h2>범위 완주 🎉</h2>
					<p>
						{game.total}쌍을 <b>{game.turn}</b>턴에 지웠습니다.
					</p>
					<p>
						최고 연속 <b>{game.bestStreak}</b> · 실수 {game.misses}회
					</p>
					<p className="note">
						{best
							? `이전 최고 ${best.turns}턴 (연속 ${best.streak})`
							: '첫 기록입니다'}
					</p>
				</div>
				<div className="actions">
					<span />
					<button
						type="button"
						className="btn primary"
						onClick={() => {
							dispatch({ type: 'pairFinish' })
							onHome()
						}}
					>
						완료
					</button>
				</div>
			</div>
		)

	const tap = (side: Side, id: string) => {
		if (game.review || wrong.length > 0) return
		if (!pick || pick.side === side) {
			setPick({ side, id })
			return
		}
		const refId = side === 'ref' ? id : pick.id
		const headId = side === 'head' ? id : pick.id
		setPick(null)
		if (refId !== headId) {
			setWrong([refId, headId])
			later(() => setWrong([]), 500)
			dispatch({ type: 'pairTry', refId, headId })
			return
		}

		// 맞췄다 — 장절과 제목을 중앙에 띄운다 (회색 카드였으면 곧바로 각인 단계)
		const v = mustVerse(refId)
		const rest = afterMatch(game, refId)
		const confirm = isStale(game, refId)
		setReveal({
			ref: v.ref,
			head: headPhrase(v.text),
			title: v.title,
			again: rest >= 0 ? null : rest,
		})
		setSplit(confirm)
		const gen = ++seq.current
		if (confirm) speak(`${spokenRef(v.ref)}. ${headPhrase(v.text)}`)
		else later(() => seq.current === gen && setReveal(null), 1500)
		dispatch({ type: 'pairTry', refId, headId })
	}

	/** 각인 단계에서 한 장을 확인 — 두 장 다 누르면 리듀서가 다음 카드를 채운다 */
	const confirmTap = (kind: Side) => {
		const rv = game.review
		if (!rv || rv[kind]) return
		const v = mustVerse(rv.verseId)
		speak(kind === 'ref' ? spokenRef(v.ref) : headPhrase(v.text))
		if (rv.ref || rv.head) {
			// 이번이 두 번째 탭 — 각인 끝, 연출을 걷는다
			seq.current++
			later(() => setReveal(null), 220)
		}
		dispatch({ type: 'pairReviewTap', kind })
	}

	const cls = (id: string | null, side: Side) => {
		if (id === null) return 'tile empty'
		const hit = wrong.includes(id) ? 'wrong' : ''
		const on = pick?.side === side && pick.id === id ? 'picked' : ''
		// 회색·부채 표시는 **장절 열만** — 양쪽을 다 칠하면 짝이 너무 드러난다
		const old = side === 'ref' && isStale(game, id) ? 'stale' : ''
		return `tile ${old} ${hit} ${on}`
	}

	const pct = Math.round((game.done / game.total) * 100)
	const rv = game.review

	return (
		<div className="screen">
			<div className="top">
				<span className="app-title">짝 맞추기</span>
				<span className="progress-label">
					{game.done}/{game.total}쌍
				</span>
				<span className="spacer" />
				<button type="button" className="icon-btn" onClick={onHome}>
					그만
				</button>
			</div>

			{/* 범위 전체에서 얼마나 지웠는지 — 이 게임의 유일한 진행 지표 */}
			<div className="pair-bar">
				<div className="pair-bar-fill" style={{ width: `${pct}%` }} />
			</div>

			<div className="pair-stats">
				<span>
					{game.turn}턴 · 연속 <b>{game.streak}</b>
				</span>
				<span className={game.streak > 1 ? 'combo hot' : 'combo'}>
					{game.bestStreak > 1 ? `최고 연속 ${game.bestStreak}` : ' '}
				</span>
			</div>

			<div className="pair-board">
				<div className="pair-col">
					{game.refs.map((id, i) => (
						<button
							type="button"
							// biome-ignore lint/suspicious/noArrayIndexKey: 슬롯 자체가 자리라 인덱스가 키다
							key={`ref-${i}`}
							className={cls(id, 'ref')}
							disabled={id === null}
							onClick={() => id && tap('ref', id)}
						>
							{id && mustVerse(id).ref}
							{/* 빚이 남은 카드는 얼마나 방치됐는지 작게 (맞춰도 다시 나온다는 신호) */}
							{id && debtOf(game, id) < 0 && (
								<span className="tile-debt">{debtOf(game, id)}</span>
							)}
						</button>
					))}
				</div>
				<div className="pair-col">
					{game.heads.map((id, i) => (
						<button
							type="button"
							// biome-ignore lint/suspicious/noArrayIndexKey: 슬롯 자체가 자리라 인덱스가 키다
							key={`head-${i}`}
							className={cls(id, 'head')}
							disabled={id === null}
							onClick={() => id && tap('head', id)}
						>
							{id && headPhrase(mustVerse(id).text)}
						</button>
					))}
				</div>
			</div>

			<div className="pair-foot">
				<span className="note">{scopeLabel(game.scope)}</span>
			</div>

			{reveal && (
				<div className={`reveal-stage ${split ? 'split' : ''}`}>
					{!split && (
						<>
							<div className="reveal-ref">{reveal.ref}</div>
							<div className="reveal-title">{reveal.title}</div>
							{reveal.again !== null && (
								<div className="reveal-again">
									한 번 더 나옵니다 ({reveal.again})
								</div>
							)}
						</>
					)}
					{split && rv && (
						<>
							<div className="reveal-title">{reveal.title}</div>
							<p className="note">두 카드를 눌러 각인하고 지우기</p>
							<button
								type="button"
								className={`tile confirm-tile ${rv.ref ? 'done' : ''}`}
								onClick={() => confirmTap('ref')}
							>
								{reveal.ref}
							</button>
							<button
								type="button"
								className={`tile confirm-tile ${rv.head ? 'done' : ''}`}
								onClick={() => confirmTap('head')}
							>
								{reveal.head}
							</button>
							{reveal.again !== null && (
								<p className="reveal-again">
									한 번 더 나옵니다 ({reveal.again})
								</p>
							)}
						</>
					)}
				</div>
			)}
		</div>
	)
}
