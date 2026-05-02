import { Fragment } from 'react'

type Props = {
	words: string[]
	boundaries: ReadonlySet<number>
	onToggleBoundary?: (index: number) => void
}

export function ChunkedText({ words, boundaries, onToggleBoundary }: Props) {
	const interactive = Boolean(onToggleBoundary)

	return (
		<p className="text-xl leading-[2.4] tracking-wide text-slate-900">
			{words.map((word, i) => {
				const isLast = i === words.length - 1
				const active = boundaries.has(i)
				return (
					// biome-ignore lint/suspicious/noArrayIndexKey: words list is rebuilt whenever the source text changes; word position is the identity here.
					<Fragment key={`${i}-${word}`}>
						<span className="whitespace-nowrap">{word}</span>
						{!isLast &&
							(interactive ? (
								<button
									type="button"
									onClick={() => onToggleBoundary?.(i)}
									aria-pressed={active}
									aria-label={active ? '끊어읽기 제거' : '끊어읽기 추가'}
									className={
										active
											? 'mx-1 inline-flex min-w-6 items-center justify-center rounded px-1 py-0.5 font-bold text-sky-600 active:bg-sky-100'
											: 'mx-0.5 inline-flex min-w-3 items-center justify-center rounded px-1 py-0.5 text-transparent active:bg-slate-100'
									}
								>
									{active ? '/' : '·'}
								</button>
							) : (
								<span
									className={active ? 'mx-1 font-bold text-sky-600' : 'mx-0.5'}
								>
									{active ? '/' : ' '}
								</span>
							))}
					</Fragment>
				)
			})}
		</p>
	)
}
