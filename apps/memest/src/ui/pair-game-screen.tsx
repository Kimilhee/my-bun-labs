import { useEffect, useRef, useState } from 'react'
import type { Action } from '../lib/app-state'
import { mustVerse } from '../lib/data'
import { headPhrase, isFinished, isStale, scopeSig } from '../lib/pair-game'
import { scopeLabel } from '../lib/session'
import type { AppData, PairGame } from '../lib/types'

type Props = {
	data: AppData
	game: PairGame
	dispatch: (a: Action) => void
	onHome: () => void
}

type Side = 'ref' | 'head'

/**
 * 짝 맞추기. 왼쪽 열이 장절, 오른쪽 열이 첫 소절이고 둘을 골라 맞추면 사라진다.
 * 진행은 리듀서(=localStorage)에 있고, 이 화면은 고른 타일·틀림 표시만 로컬로 든다.
 */
export function PairGameScreen({ data, game, dispatch, onHome }: Props) {
	const [pick, setPick] = useState<{ side: Side; id: string } | null>(null)
	const [wrong, setWrong] = useState<string[]>([])
	const [flash, setFlash] = useState<{ ref: string; title: string } | null>(
		null,
	)

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
						점수 <b>{game.score.toLocaleString()}</b> · 실수 {game.misses}회
					</p>
					<p className="note">
						{best
							? `이전 최고 ${best.score.toLocaleString()}점 (${best.turns}턴)`
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
		if (refId === headId) {
			// 복습 확인이 뜨는 카드는 그 화면이 장절·제목을 보여주므로 생략
			if (!isStale(game, refId)) {
				const v = mustVerse(refId)
				setFlash({ ref: v.ref, title: v.title })
				later(() => setFlash(null), 2000)
			}
		} else {
			setWrong([refId, headId])
			later(() => setWrong([]), 500)
		}
		dispatch({ type: 'pairTry', refId, headId })
	}

	const cls = (id: string | null, side: Side) => {
		if (id === null) return 'tile empty'
		const hit = wrong.includes(id) ? 'wrong' : ''
		const on = pick?.side === side && pick.id === id ? 'picked' : ''
		// 회색 표시는 **장절 열만** — 양쪽을 다 칠하면 짝이 너무 드러난다
		const old = side === 'ref' && isStale(game, id) ? 'stale' : ''
		return `tile ${old} ${hit} ${on}`
	}

	const pct = Math.round((game.done / game.total) * 100)
	const review = game.review
	const rv = review ? mustVerse(review.verseId) : null

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
					{game.turn}턴 · 점수 <b>{game.score.toLocaleString()}</b>
				</span>
				<span className={game.combo > 1 ? 'combo hot' : 'combo'}>
					{game.combo > 1 ? `${game.combo}콤보 x${game.combo}` : ' '}
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

			{/* 맞춘 짝 — 화면 중앙에 크게 (탭은 그대로 판으로 통과한다) */}
			{flash && (
				<div className="match-flash">
					<div className="match-ref">{flash.ref}</div>
					<div className="match-title">{flash.title}</div>
				</div>
			)}

			{/* 오래 남아 있던 카드를 맞췄을 때 — 두 타일을 각각 눌러 확인하고 지운다 */}
			{review && rv && (
				<div className="review-overlay">
					{/* 정답 공개는 맞춘 짝 표시와 같은 모양으로 */}
					<div className="match-ref">{rv.ref}</div>
					<div className="match-title">{rv.title}</div>
					<p className="note">두 카드를 눌러 확인하고 지우기</p>
					<button
						type="button"
						className={`tile review-tile ${review.ref ? 'done' : ''}`}
						onClick={() => dispatch({ type: 'pairReviewTap', kind: 'ref' })}
					>
						{rv.ref}
					</button>
					<button
						type="button"
						className={`tile review-tile ${review.head ? 'done' : ''}`}
						onClick={() => dispatch({ type: 'pairReviewTap', kind: 'head' })}
					>
						{headPhrase(rv.text)}
					</button>
				</div>
			)}
		</div>
	)
}
