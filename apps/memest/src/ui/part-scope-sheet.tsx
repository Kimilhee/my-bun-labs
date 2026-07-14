import { useState } from 'react'
import { parts } from '../lib/data'

type Props = {
	scope: string[] | null // null = 전체
	onChange: (codes: string[] | null) => void
	onClose: () => void
}

/** 복습 범위 파트 선택 시트. [적용]을 눌러야 반영되고, [취소]·배경 탭은 폐기. */
export function PartScopeSheet({ scope, onChange, onClose }: Props) {
	const allCodes = parts.map((p) => p.code)
	const [selected, setSelected] = useState<Set<string>>(
		() => new Set(scope === null ? allCodes : scope),
	)
	const verseCount = parts
		.filter((p) => selected.has(p.code))
		.reduce((a, p) => a + p.count, 0)

	const toggle = (code: string) =>
		setSelected((prev) => {
			const next = new Set(prev)
			if (next.has(code)) next.delete(code)
			else next.add(code)
			return next
		})

	const apply = () => {
		onChange(selected.size === allCodes.length ? null : [...selected])
		onClose()
	}

	return (
		<div className="sheet-backdrop">
			<button
				type="button"
				className="backdrop-hit"
				onClick={onClose}
				aria-label="취소"
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
						onClick={() =>
							setSelected(
								selected.size === 0 ? new Set(allCodes) : new Set<string>(),
							)
						}
					>
						{selected.size === 0 ? '모두 선택' : '모두 해제'}
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
							최소 1개 파트를 선택해야 적용할 수 있습니다.
						</p>
					)}
				</div>
				<div className="actions sheet-actions">
					<button type="button" className="btn" onClick={onClose}>
						취소
					</button>
					<button
						type="button"
						className="btn primary"
						disabled={selected.size === 0}
						onClick={apply}
					>
						적용 ({verseCount}구절)
					</button>
				</div>
			</div>
		</div>
	)
}
