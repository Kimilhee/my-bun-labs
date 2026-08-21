import { useState } from 'react'
import { isStarred, parts, verses } from '../lib/data'
import { scopeKey } from '../lib/session'
import type { AppData, Part } from '../lib/types'

type Props = {
	scope: string[] | null // null = 전체 (마지막에 고른 범위)
	stars: AppData['stars']
	/** 고른 범위로 하드드릴 세션을 시작한다 */
	onApply: (scope: string[] | null, starredOnly: boolean) => void
	onClose: () => void
}

/** 중제목별 구절 수 (`코드#중제목` → 개수) */
const midCounts = new Map<string, number>()
for (const p of parts)
	for (const mid of p.midTitles)
		midCounts.set(
			scopeKey(p.code, mid),
			verses.filter((v) => v.part === p.part && v.midTitle === mid).length,
		)

/**
 * 선택의 최소 단위 = 잎(leaf). 중제목이 있는 파트는 중제목마다 하나씩,
 * 없는 파트는 파트 자체가 잎이다. 저장할 때 잎이 다 모이면 파트 코드 하나로 접는다.
 */
const leavesOf = (p: Part) =>
	p.midTitles.length === 0
		? [p.code]
		: p.midTitles.map((mid) => scopeKey(p.code, mid))
const allLeaves = parts.flatMap(leavesOf)

/** 저장된 범위 → 잎 집합 (파트 코드 하나는 그 파트의 잎 전부를 편다) */
function expand(scope: string[] | null): Set<string> {
	if (scope === null) return new Set(allLeaves)
	const out = new Set<string>()
	for (const entry of scope) {
		const p = parts.find((q) => q.code === entry)
		if (p) for (const leaf of leavesOf(p)) out.add(leaf)
		else out.add(entry)
	}
	return out
}

/** 잎 집합 → 저장 형태 (파트가 통째로 선택됐으면 코드 하나로) */
function collapse(selected: Set<string>): string[] {
	const out: string[] = []
	for (const p of parts) {
		const leaves = leavesOf(p)
		const on = leaves.filter((l) => selected.has(l))
		if (on.length === leaves.length) out.push(p.code)
		else out.push(...on)
	}
	return out
}

const countOf = (leaf: string) =>
	midCounts.get(leaf) ?? parts.find((p) => p.code === leaf)?.count ?? 0

/** 하드드릴 범위 선택 시트. [시작]을 눌러야 반영되고, [취소]·배경 탭은 폐기. */
export function PartScopeSheet({ scope, stars, onApply, onClose }: Props) {
	const [selected, setSelected] = useState<Set<string>>(() => expand(scope))
	const [starredOnly, setStarredOnly] = useState(false)
	// ▸ 탭으로 편 파트 (중제목이 있는 파트에만 화살표가 붙는다)
	const [open, setOpen] = useState<Set<string>>(() => new Set<string>())

	const verseCount = [...selected].reduce((a, leaf) => a + countOf(leaf), 0)
	const partCount = parts.filter((p) =>
		leavesOf(p).some((l) => selected.has(l)),
	).length

	const setLeaves = (leaves: string[], on: boolean) =>
		setSelected((prev) => {
			const next = new Set(prev)
			for (const l of leaves) {
				if (on) next.add(l)
				else next.delete(l)
			}
			return next
		})

	const toggleOpen = (code: string) =>
		setOpen((prev) => {
			const next = new Set(prev)
			if (next.has(code)) next.delete(code)
			else next.add(code)
			return next
		})

	const picked = selected.size === allLeaves.length ? null : collapse(selected)
	// 별표만 필터를 켜면 실제 시작 구절 수가 줄어든다
	const startCount = starredOnly
		? verses.filter(
				(v) =>
					[...selected].some((leaf) => {
						const cut = leaf.indexOf('#')
						const code = cut < 0 ? leaf : leaf.slice(0, cut)
						return (
							v.id.startsWith(`${code}-`) &&
							(cut < 0 || v.midTitle === leaf.slice(cut + 1))
						)
					}) && isStarred(stars, v),
			).length
		: verseCount

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
					<b>하드드릴 범위</b>
					<span className="note">
						{partCount}개 파트 · {verseCount}구절
					</span>
					<span className="spacer" />
					<button
						type="button"
						className="icon-btn"
						onClick={() =>
							setSelected(
								selected.size === 0 ? new Set(allLeaves) : new Set<string>(),
							)
						}
					>
						{selected.size === 0 ? '모두 선택' : '모두 해제'}
					</button>
				</div>
				<div className="sheet-list scope-list">
					{parts.map((p) => {
						const leaves = leavesOf(p)
						const on = leaves.filter((l) => selected.has(l)).length
						const all = on === leaves.length
						const expanded = open.has(p.code)
						return (
							<div key={p.code}>
								{/* 체크박스·이름은 파트 전체 토글, ▸는 펼침, 우측 구절 수는 리스트 열기 */}
								<div className="row scope-row">
									{p.midTitles.length > 0 ? (
										<button
											type="button"
											className="scope-caret"
											onClick={() => toggleOpen(p.code)}
											aria-label={`${p.part} 중제목 ${expanded ? '접기' : '펼치기'}`}
										>
											{expanded ? '▼' : '▶'}
										</button>
									) : (
										<span className="scope-caret" />
									)}
									<label className="scope-pick">
										<input
											type="checkbox"
											checked={all}
											ref={(el) => {
												if (el) el.indeterminate = on > 0 && !all
											}}
											onChange={() => setLeaves(leaves, !all)}
										/>
										{p.part}
										{p.title !== p.part && !p.part.includes(p.title) && (
											<span className="note">{p.title}</span>
										)}
									</label>
									<span className="spacer" />
									<span className="scope-count">{p.count}</span>
								</div>
								{expanded &&
									p.midTitles.map((mid) => {
										const leaf = scopeKey(p.code, mid)
										return (
											<div className="row scope-row scope-mid" key={leaf}>
												<span className="scope-caret" />
												<label className="scope-pick">
													<input
														type="checkbox"
														checked={selected.has(leaf)}
														onChange={() =>
															setLeaves([leaf], !selected.has(leaf))
														}
													/>
													{mid}
												</label>
												<span className="spacer" />
												<span className="scope-count">{countOf(leaf)}</span>
											</div>
										)
									})}
							</div>
						)
					})}
					{selected.size === 0 && (
						<p className="note scope-warn">
							최소 1개 범위를 선택해야 시작할 수 있습니다.
						</p>
					)}
					<label className="row scope-starred">
						<input
							type="checkbox"
							checked={starredOnly}
							onChange={(e) => setStarredOnly(e.target.checked)}
						/>
						별표한 구절만
					</label>
				</div>
				<div className="actions sheet-actions">
					<button type="button" className="btn" onClick={onClose}>
						취소
					</button>
					<button
						type="button"
						className="btn primary"
						disabled={startCount === 0}
						onClick={() => onApply(picked, starredOnly)}
					>
						시작 ({startCount}구절)
					</button>
				</div>
			</div>
		</div>
	)
}
