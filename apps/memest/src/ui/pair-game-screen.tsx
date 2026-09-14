import { useEffect, useRef, useState } from 'react'
import type { Action } from '../lib/app-state'
import { mustVerse } from '../lib/data'
import {
	clearBonus,
	dealBoard,
	matchScore,
	PAIRS,
	type PairPool,
	poolLabel,
	poolVerses,
	refill,
	type Tile,
} from '../lib/pair-game'
import type { AppData } from '../lib/types'

type Props = {
	data: AppData
	pool: PairPool
	dispatch: (a: Action) => void
	onHome: () => void
}

type Board = { no: number; tiles: Tile[]; deck: string[] }

/**
 * 짝 맞추기. 장절 타일과 첫 소절 타일을 맞추면 상하이처럼 사라지고, 보드를 비우면
 * 다음 스테이지가 깔린다. 끝은 없고 [그만]으로 나온다 — 점수만 기록에 남는다.
 */
export function PairGameScreen({ data, pool, dispatch, onHome }: Props) {
	const ids = poolVerses(pool, data).map((v) => v.id)
	const size = Math.min(PAIRS, ids.length)

	const [board, setBoard] = useState<Board>(() => {
		const { tiles, rest } = dealBoard(refill([], ids, size), size)
		return { no: 1, tiles, deck: rest }
	})
	const [gone, setGone] = useState<string[]>([])
	const [picked, setPicked] = useState<Tile | null>(null)
	const [wrong, setWrong] = useState<string[]>([])
	const [flash, setFlash] = useState<string | null>(null)
	const [score, setScore] = useState(0)
	const [combo, setCombo] = useState(0)
	const [misses, setMisses] = useState(0) // 이 보드에서 틀린 횟수 (클리어 보너스 판정)
	const [cleared, setCleared] = useState(false) // 클리어 연출 중 (입력 잠금)

	// 언마운트 시 남은 타이머 정리 — 클리어 연출 도중에 [그만]을 눌러도 안전하게
	const timers = useRef<number[]>([])
	const later = (fn: () => void, ms: number) => {
		timers.current.push(window.setTimeout(fn, ms))
	}
	useEffect(() => () => timers.current.forEach(clearTimeout), [])

	const best = data.pairBest[pool]

	const quit = () => {
		dispatch({ type: 'pairResult', pool, score, stage: board.no - 1 })
		onHome()
	}

	const nextBoard = (deck: string[], no: number) => {
		const ready = refill(deck, ids, size)
		const { tiles, rest } = dealBoard(ready, size)
		setBoard({ no, tiles, deck: rest })
		setGone([])
		setPicked(null)
		setMisses(0)
		setCleared(false)
	}

	const tap = (t: Tile) => {
		if (cleared || gone.includes(t.key) || wrong.length > 0) return
		if (!picked) {
			setPicked(t)
			return
		}
		if (picked.key === t.key) {
			setPicked(null)
			return
		}
		// 같은 종류를 또 누른 건 "고른 걸 바꾸겠다"는 뜻 (실수 아님 — 감점 없음)
		if (picked.kind === t.kind) {
			setPicked(t)
			return
		}
		if (picked.verseId !== t.verseId) {
			setWrong([picked.key, t.key])
			setPicked(null)
			setCombo(0)
			setMisses((m) => m + 1)
			later(() => setWrong([]), 500)
			return
		}

		const v = mustVerse(t.verseId)
		const nextCombo = combo + 1
		const nextGone = [...gone, picked.key, t.key]
		setCombo(nextCombo)
		setScore((s) => s + matchScore(nextCombo))
		setGone(nextGone)
		setPicked(null)
		setFlash(`${v.ref} · ${v.title}`)

		if (nextGone.length < board.tiles.length) {
			later(() => setFlash(null), 1500)
			return
		}
		// 보드 클리어 — 보너스를 얹고 잠깐 보여준 다음 다음 스테이지
		const bonus = clearBonus(misses)
		setCleared(true)
		setScore((s) => s + bonus)
		setFlash(`스테이지 ${board.no} 클리어 +${bonus}`)
		// 기록은 스테이지마다 저장한다 (앱을 그냥 닫아도 남게)
		later(() => {
			dispatch({
				type: 'pairResult',
				pool,
				score: score + matchScore(nextCombo) + bonus,
				stage: board.no,
			})
			nextBoard(board.deck, board.no + 1)
			setFlash(null)
		}, 1100)
	}

	const state = (t: Tile) =>
		gone.includes(t.key)
			? 'gone'
			: wrong.includes(t.key)
				? 'wrong'
				: picked?.key === t.key
					? 'picked'
					: ''

	return (
		<div className="screen">
			<div className="top">
				<span className="app-title">짝 맞추기</span>
				<span className="badge">{poolLabel[pool]}</span>
				<span className="spacer" />
				<button type="button" className="icon-btn" onClick={quit}>
					그만
				</button>
			</div>

			<div className="pair-stats">
				<span>
					스테이지 <b>{board.no}</b>
				</span>
				<span>
					점수 <b>{score.toLocaleString()}</b>
				</span>
				<span className={combo > 1 ? 'combo hot' : 'combo'}>
					{combo > 1 ? `${combo}콤보 x${Math.min(combo, 5)}` : ' '}
				</span>
			</div>

			<div className="pair-flash">{flash ?? ' '}</div>

			<div className="pair-board" key={board.no}>
				{board.tiles.map((t, i) => (
					<button
						type="button"
						key={t.key}
						className={`tile t-${t.kind} ${state(t)}`}
						style={{ animationDelay: `${i * 45}ms` }}
						onClick={() => tap(t)}
					>
						{t.label}
					</button>
				))}
			</div>

			<div className="pair-foot">
				<span className="note">
					{best
						? `최고 ${best.score.toLocaleString()}점 · ${best.stage}스테이지`
						: '장절과 첫 소절을 짝지어 보드를 비우세요'}
				</span>
			</div>
		</div>
	)
}
