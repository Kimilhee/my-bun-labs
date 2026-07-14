import { parts } from '../lib/data'

type Props = {
	scope: string[] | null // null = 전체
	onChange: (codes: string[] | null) => void
	onClose: () => void
}

/** 복습 범위 파트 선택 시트. 체크 즉시 적용된다. */
export function PartScopeSheet({ scope, onChange, onClose }: Props) {
	const allCodes = parts.map((p) => p.code)
	const selected = new Set(scope === null ? allCodes : scope)
	const verseCount = parts
		.filter((p) => selected.has(p.code))
		.reduce((a, p) => a + p.count, 0)

	const emit = (next: Set<string>) =>
		onChange(next.size === allCodes.length ? null : [...next])

	const toggle = (code: string) => {
		const next = new Set(selected)
		if (next.has(code)) next.delete(code)
		else next.add(code)
		emit(next)
	}

	return (
		<div className="sheet-backdrop">
			<button
				type="button"
				className="backdrop-hit"
				onClick={onClose}
				aria-label="닫기"
			/>
			<div className="sheet full">
				<div className="sheet-head">
					<b>복습 범위</b>
					<span className="note">
						{selected.size}개 파트 · {verseCount}구절
					</span>
					<span className="spacer" />
					<button
						type="button"
						className="icon-btn"
						onClick={() => onChange([])}
					>
						모두 해제
					</button>
					<button type="button" className="icon-btn" onClick={onClose}>
						닫기
					</button>
				</div>
				<div className="sheet-list scope-list">
					{parts.map((p) => (
						<label className="row scope-row" key={p.code}>
							<input
								type="checkbox"
								checked={selected.has(p.code)}
								onChange={() => toggle(p.code)}
							/>
							{p.part}
							{p.title !== p.part && !p.part.includes(p.title) && (
								<span className="note">{p.title}</span>
							)}
							<span className="spacer" />
							<span className="note">{p.count}</span>
						</label>
					))}
					{selected.size === 0 && (
						<p className="note scope-warn">
							선택된 파트가 없어요 — 최소 1개는 선택해야 복습할 수 있습니다.
						</p>
					)}
				</div>
			</div>
		</div>
	)
}
