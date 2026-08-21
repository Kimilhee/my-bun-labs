import { useState } from 'react'
import type { Action } from '../lib/app-state'
import { dayAt, days, todayStr } from '../lib/curriculum'
import { isStarred, verses } from '../lib/data'
import { scopeLabel } from '../lib/session'
import type { AppData } from '../lib/types'
import { PartScopeSheet } from './part-scope-sheet'

type Props = {
	data: AppData
	dispatch: (a: Action) => void
	/** 세션으로 들어간다 (홈에 나와 있던 상태를 푼다) */
	onEnter: () => void
	onSettings: () => void
}

/**
 * 홈. 두 모드의 입구다 — 진도를 따라가는 [매일 복습]과, 범위를 직접 골라
 * 부채가 없어질 때까지 파는 [하드 드릴]. 두 세션은 서로 독립이라 오가도 각자 남는다.
 */
export function StartScreen({ data, dispatch, onEnter, onSettings }: Props) {
	const [scopeOpen, setScopeOpen] = useState(false)

	const today = dayAt(data.daily.order[0] ?? 0)
	// 이번 바퀴에서 몇 번째인지 (남은 큐 길이로 역산)
	const dayNo = days.length - data.daily.order.length + 1
	const daily = data.sessions.daily
	const drill = data.sessions.drill
	const doneToday = data.daily.doneDate === todayStr() && !daily

	const starredCount = verses.filter((v) => isStarred(data.stars, v)).length
	const debtCount = Object.keys(data.drill).length
	const left = (s: typeof daily) => (s ? new Set(s.queue).size : 0)

	return (
		<div className="screen">
			<div className="top">
				<span className="app-title">Amsong</span>
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

			<div className="start-body">
				<div className="mode-card">
					<div className="mode-head">
						<b>매일 복습</b>
						<span className="note">
							{dayNo}/{days.length}일차
						</span>
					</div>
					<div className="mode-title">{today.title}</div>
					{doneToday ? (
						<>
							<button type="button" className="btn big" disabled>
								오늘 분량 완료 ✓
							</button>
							<p className="note">
								다음 진도는 내일. 더 하고 싶으면 하드 드릴로.
							</p>
						</>
					) : (
						<button
							type="button"
							className="btn primary big"
							onClick={() => {
								if (!daily) dispatch({ type: 'startDaily' })
								else dispatch({ type: 'setMode', mode: 'daily' })
								onEnter()
							}}
						>
							{daily
								? `이어하기 (${left(daily)}구절 남음)`
								: `시작 (${today.ids.length}구절)`}
						</button>
					)}
				</div>

				<div className="mode-card">
					<div className="mode-head">
						<b>하드 드릴</b>
						<span className="note">
							{debtCount > 0 ? `부채 ${debtCount}구절` : '부채 없음'}
						</span>
					</div>
					<div className="mode-title">
						{drill
							? scopeLabel(drill.scopeCodes)
							: '범위를 직접 골라 부채가 없어질 때까지'}
					</div>
					{drill && (
						<button
							type="button"
							className="btn primary big"
							onClick={() => {
								dispatch({ type: 'setMode', mode: 'drill' })
								onEnter()
							}}
						>
							이어하기 ({left(drill)}구절 남음)
						</button>
					)}
					<button
						type="button"
						className={`btn ${drill ? '' : 'primary big'}`}
						onClick={() => setScopeOpen(true)}
					>
						{drill ? '범위 새로 고르기…' : '범위 고르기…'}
					</button>
				</div>

				<p className="note home-foot">
					별표 {starredCount}구절 · 전체 {verses.length}구절 · 진도{' '}
					{days.length}일 순환
				</p>
			</div>

			{scopeOpen && (
				<PartScopeSheet
					scope={data.settings.scopeParts}
					stars={data.stars}
					onApply={(scope, starredOnly) => {
						dispatch({ type: 'startDrill', scope, starredOnly })
						setScopeOpen(false)
						onEnter()
					}}
					onClose={() => setScopeOpen(false)}
				/>
			)}
		</div>
	)
}
