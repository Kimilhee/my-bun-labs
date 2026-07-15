import { useState } from 'react'
import type { Action } from '../lib/app-state'
import type { AppData } from '../lib/types'

type Props = {
	data: AppData
	dispatch: (a: Action) => void
	onClose: () => void
}

export function SettingsSheet({ data, dispatch, onClose }: Props) {
	const [importText, setImportText] = useState('')
	const [msg, setMsg] = useState('')
	const [resetArmed, setResetArmed] = useState(false)

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
				data: { ...parsed, session: parsed.session ?? null },
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
					<label className="row">
						일일 세션 크기
						<input
							type="number"
							inputMode="numeric"
							value={data.settings.dailySize}
							onChange={(e) =>
								dispatch({
									type: 'setDailySize',
									size: Number.parseInt(e.target.value, 10) || 1,
								})
							}
						/>
					</label>

					<label className="row">
						<input
							type="checkbox"
							checked={data.settings.voiceRecitation}
							onChange={(e) =>
								dispatch({ type: 'setVoiceRecitation', on: e.target.checked })
							}
						/>
						음성 암송 — 끄면 [말씀 확인] 눈 확인 모드
					</label>

					<label className="row">
						<input
							type="checkbox"
							checked={data.settings.autoAdvance}
							onChange={(e) =>
								dispatch({ type: 'setAutoAdvance', on: e.target.checked })
							}
						/>
						완주 시 자동 넘김 — 끄면 결과 화면에 머무름
					</label>

					<label className="row">
						<input
							type="checkbox"
							checked={data.settings.firstPhraseMode}
							onChange={(e) =>
								dispatch({ type: 'setFirstPhraseMode', on: e.target.checked })
							}
						/>
						첫소절 매칭 모드 — 처음 10글자만 맞으면 통과
					</label>

					{data.session && (
						<button
							type="button"
							className="btn"
							onClick={() => {
								dispatch({ type: 'quitSession' })
								onClose()
							}}
						>
							진행 중인 세션 종료
						</button>
					)}

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

					<p className="note version">memest v{__APP_VERSION__}</p>
				</div>
			</div>
		</div>
	)
}
