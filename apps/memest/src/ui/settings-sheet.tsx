import { useState } from 'react'
import type { Action } from '../lib/app-state'
import type { AppData } from '../lib/types'

type Props = {
	data: AppData
	dispatch: (a: Action) => void
	/** 세션을 버리지 않고 홈으로 */
	onHome: () => void
	/** 모드를 바꿔 그 모드의 세션으로 */
	onEnter: () => void
	onClose: () => void
}

export function SettingsSheet({
	data,
	dispatch,
	onHome,
	onEnter,
	onClose,
}: Props) {
	const [importText, setImportText] = useState('')
	const [msg, setMsg] = useState('')
	const [resetArmed, setResetArmed] = useState(false)
	const debtCount = Object.keys(data.drill).length

	const doExport = async () => {
		const json = JSON.stringify(data)
		try {
			await navigator.clipboard.writeText(json)
			setMsg(`클립보드에 복사됨 (${json.length.toLocaleString()}자)`)
		} catch {
			setImportText(json)
			setMsg('클립보드 실패 — 아래 텍스트를 직접 복사하세요')
		}
	}

	const doImport = () => {
		try {
			const parsed = JSON.parse(importText) as AppData
			if (typeof parsed.progress !== 'object') throw new Error('bad format')
			dispatch({
				type: 'importData',
				data: {
					...parsed,
					drill: parsed.drill ?? {},
					stars: parsed.stars ?? {},
					stats: parsed.stats ?? {},
				},
			})
			setMsg('가져오기 완료')
		} catch {
			setMsg('가져오기 실패 — JSON 형식을 확인하세요')
		}
	}

	return (
		<div className="sheet-backdrop">
			<button
				type="button"
				className="backdrop-hit"
				onClick={onClose}
				aria-label="닫기"
			/>
			<div className="sheet full settings">
				<div className="sheet-head">
					<b>설정</b>
					<span className="spacer" />
					<button type="button" className="icon-btn" onClick={onClose}>
						닫기
					</button>
				</div>
				<div className="settings-body">
					<h3>모드</h3>
					<div className="mode-pick">
						{(['daily', 'drill'] as const).map((m) => (
							<button
								type="button"
								key={m}
								className={`btn ${data.settings.mode === m ? 'primary' : ''}`}
								onClick={() => {
									dispatch({ type: 'setMode', mode: m })
									onEnter()
									onClose()
								}}
							>
								{m === 'daily' ? '매일 복습' : '하드 드릴'}
							</button>
						))}
					</div>
					<p className="note">
						두 모드는 완전히 별개의 세션입니다. 오가도 각자의 진행이 그대로
						남아요. 매일 복습은 진도를 따라 하루치씩(점수 없음), 하드 드릴은
						고른 범위를 부채가 없어질 때까지(점수 있음).
						{debtCount > 0 && ` — 남은 부채 ${debtCount}구절`}
					</p>

					<button
						type="button"
						className="btn"
						onClick={() => {
							onHome()
							onClose()
						}}
					>
						홈으로
					</button>

					<h3>백업</h3>
					<button type="button" className="btn" onClick={doExport}>
						진행도 내보내기 (클립보드)
					</button>
					<textarea
						placeholder="여기에 백업 JSON을 붙여넣고 가져오기"
						value={importText}
						onChange={(e) => setImportText(e.target.value)}
					/>
					<button
						type="button"
						className="btn"
						disabled={!importText}
						onClick={doImport}
					>
						가져오기
					</button>

					<h3>위험 구역</h3>
					{resetArmed ? (
						<button
							type="button"
							className="btn danger"
							onClick={() => {
								dispatch({ type: 'resetProgress' })
								setResetArmed(false)
								setMsg('진행도를 초기화했습니다')
							}}
						>
							정말 초기화 (되돌릴 수 없음)
						</button>
					) : (
						<button
							type="button"
							className="btn"
							onClick={() => setResetArmed(true)}
						>
							진행도 초기화…
						</button>
					)}

					{msg && <p className="note">{msg}</p>}

					<p className="note version">Amsong v{__APP_VERSION__}</p>
				</div>
			</div>
		</div>
	)
}
