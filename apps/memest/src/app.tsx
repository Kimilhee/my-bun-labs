import { useEffect, useReducer, useState } from 'react'
import { reduce } from './lib/app-state'
import { loadData, saveData } from './lib/storage'
import { SessionScreen } from './ui/session-screen'
import { SettingsSheet } from './ui/settings-sheet'
import { StartScreen } from './ui/start-screen'
import { SummaryScreen } from './ui/summary-screen'

export function App() {
	const [data, dispatch] = useReducer(reduce, undefined, loadData)
	const [settingsOpen, setSettingsOpen] = useState(false)
	useEffect(() => saveData(data), [data])

	const s = data.session
	const openSettings = () => setSettingsOpen(true)
	return (
		<div className="app">
			{!s && (
				<StartScreen
					data={data}
					dispatch={dispatch}
					onSettings={openSettings}
				/>
			)}
			{s && s.stage !== 'done' && (
				<SessionScreen
					data={data}
					session={s}
					dispatch={dispatch}
					onSettings={openSettings}
				/>
			)}
			{s && s.stage === 'done' && (
				<SummaryScreen session={s} dispatch={dispatch} />
			)}
			{settingsOpen && (
				<SettingsSheet
					data={data}
					dispatch={dispatch}
					onClose={() => setSettingsOpen(false)}
				/>
			)}
		</div>
	)
}
