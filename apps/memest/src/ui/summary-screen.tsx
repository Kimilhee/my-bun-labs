import type { Action } from '../lib/app-state'
import { dayAt, days } from '../lib/curriculum'
import type { AppData, Session } from '../lib/types'

type Props = {
	data: AppData
	session: Session
	dispatch: (a: Action) => void
	onHome: () => void
}

export function SummaryScreen({ data, session, dispatch, onHome }: Props) {
	const counted = session.history.filter((e) => e.counted)
	const clean = counted.filter((e) => !e.wrong && e.hints === 0).length
	const recovered = counted.length - clean
	const uniqueCards = new Set(session.history.map((e) => e.verseId)).size

	return (
		<div className="screen center">
			<div className="summary">
				<h2>세션 완주 🎉</h2>
				<p>
					카드 <b>{uniqueCards}</b>개를 모두 열었습니다.
				</p>
				<p>
					바로 떠오른 연결 <b>{clean}</b>개 · 회복한 연결 <b>{recovered}</b>개
				</p>
				{session.mode === 'daily' ? (
					<p className="note">
						다음 진도는 내일 — {days.length - data.daily.order.length + 1}일차{' '}
						{dayAt(data.daily.order[0] ?? 0).title}
					</p>
				) : (
					<p className="note">부채가 남은 구절은 다음 드릴에서 다시 만나요.</p>
				)}
			</div>
			<div className="actions">
				<span />
				<button
					type="button"
					className="btn primary"
					onClick={() => {
						dispatch({ type: 'quitSession' })
						onHome()
					}}
				>
					완료
				</button>
			</div>
		</div>
	)
}
