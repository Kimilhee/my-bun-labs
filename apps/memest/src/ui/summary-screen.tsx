import type { Action } from '../lib/app-state'
import type { Session } from '../lib/types'

type Props = { session: Session; dispatch: (a: Action) => void }

export function SummaryScreen({ session, dispatch }: Props) {
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
				{session.mode === 'intensive' && (
					<p className="note">회복한 연결은 곧 다시 만나요.</p>
				)}
			</div>
			<div className="actions">
				<span />
				<button
					type="button"
					className="btn primary"
					onClick={() => dispatch({ type: 'quitSession' })}
				>
					완료
				</button>
			</div>
		</div>
	)
}
