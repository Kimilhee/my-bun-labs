import { useState } from 'react'
import type { Action } from '../lib/app-state'
import { parts, verses } from '../lib/data'
import { todayStr } from '../lib/scheduler'
import { buildIntensiveQueue } from '../lib/session'
import type { AppData } from '../lib/types'

type Props = {
	data: AppData
	dispatch: (a: Action) => void
	onSettings: () => void
}

export function StartScreen({ data, dispatch, onSettings }: Props) {
	const [setupOpen, setSetupOpen] = useState(false)
	const [codes, setCodes] = useState<string[]>([])
	const [starredOnly, setStarredOnly] = useState(false)
	const [capInput, setCapInput] = useState('')

	const today = todayStr()
	const dueCount = verses.filter(
		(v) => (data.progress[v.id]?.due ?? '9999') <= today && data.progress[v.id],
	).length
	const unseenCount = verses.filter((v) => !data.progress[v.id]).length
	const starredCount = verses.filter((v) => v.starred).length

	const matched = buildIntensiveQueue(
		codes,
		starredOnly,
		Number.POSITIVE_INFINITY,
	).length
	const cap = Number.parseInt(capInput, 10) || matched

	const toggleCode = (code: string) =>
		setCodes((prev) =>
			prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
		)

	return (
		<div className="screen">
			<div className="top">
				<span className="app-title">memest</span>
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
				<div className="stats">
					<div className="stat">
						<b>{dueCount}</b>
						<span>오늘 복습</span>
					</div>
					<div className="stat">
						<b>{unseenCount}</b>
						<span>미진단</span>
					</div>
					<div className="stat">
						<b>{starredCount}</b>
						<span>별표</span>
					</div>
					<div className="stat">
						<b>{verses.length}</b>
						<span>전체</span>
					</div>
				</div>

				<button
					type="button"
					className="btn primary big"
					onClick={() => dispatch({ type: 'startDaily' })}
				>
					일일 세션 시작 (
					{Math.min(dueCount + unseenCount, data.settings.dailySize)}개)
				</button>

				<button
					type="button"
					className="btn"
					onClick={() => setSetupOpen(!setupOpen)}
				>
					집중 세션 {setupOpen ? '접기' : '구성…'}
				</button>

				{setupOpen && (
					<div className="intensive-setup">
						<div className="chips">
							{parts.map((p) => (
								<button
									type="button"
									key={p.code}
									className={`chip ${codes.includes(p.code) ? 'on' : ''}`}
									onClick={() => toggleCode(p.code)}
								>
									{p.part} <small>{p.count}</small>
								</button>
							))}
						</div>
						<label className="row">
							<input
								type="checkbox"
								checked={starredOnly}
								onChange={(e) => setStarredOnly(e.target.checked)}
							/>
							별표 카드만
						</label>
						<label className="row">
							구절 수
							<input
								type="number"
								inputMode="numeric"
								placeholder={String(matched)}
								value={capInput}
								onChange={(e) => setCapInput(e.target.value)}
							/>
							/ {matched}개 선택됨
						</label>
						<button
							type="button"
							className="btn primary"
							disabled={matched === 0}
							onClick={() =>
								dispatch({ type: 'startIntensive', codes, starredOnly, cap })
							}
						>
							집중 세션 시작 ({Math.min(cap, matched)}개)
						</button>
					</div>
				)}
			</div>
		</div>
	)
}
