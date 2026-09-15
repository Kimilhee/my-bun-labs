import { useEffect, useReducer, useState } from 'react'
import { reduce } from './lib/app-state'
import { loadData, saveData } from './lib/storage'
import { PairGameScreen } from './ui/pair-game-screen'
import { SessionScreen } from './ui/session-screen'
import { SettingsSheet } from './ui/settings-sheet'
import { StartScreen } from './ui/start-screen'
import { SummaryScreen } from './ui/summary-screen'

export function App() {
	const [data, dispatch] = useReducer(reduce, undefined, loadData)
	const [settingsOpen, setSettingsOpen] = useState(false)
	// 세션을 버리지 않고 홈으로 나와 있는 상태 (모드 전환·[홈으로])
	const [atHome, setAtHome] = useState(false)
	// 짝 맞추기는 세션 바깥의 화면 — 홈에서 들어갈 때만 열린다 (앱 재시작 시엔 홈)
	const [inPair, setInPair] = useState(false)
	useEffect(() => saveData(data), [data])

	const s = data.sessions[data.settings.mode]
	const openSettings = () => setSettingsOpen(true)
	const show = atHome ? null : s
	if (inPair && data.pair)
		return (
			<div className="app">
				<PairGameScreen
					data={data}
					game={data.pair}
					dispatch={dispatch}
					onHome={() => setInPair(false)}
				/>
			</div>
		)
	return (
		<div className="app">
			{!show && (
				<StartScreen
					data={data}
					dispatch={dispatch}
					onEnter={() => setAtHome(false)}
					onPair={() => setInPair(true)}
					onSettings={openSettings}
				/>
			)}
			{show && show.stage !== 'done' && (
				<SessionScreen
					data={data}
					session={show}
					dispatch={dispatch}
					onSettings={openSettings}
				/>
			)}
			{show && show.stage === 'done' && (
				<SummaryScreen
					data={data}
					session={show}
					dispatch={dispatch}
					onHome={() => setAtHome(true)}
				/>
			)}
			{settingsOpen && (
				<SettingsSheet
					data={data}
					dispatch={dispatch}
					onHome={() => setAtHome(true)}
					onEnter={() => setAtHome(false)}
					onClose={() => setSettingsOpen(false)}
				/>
			)}
		</div>
	)
}
