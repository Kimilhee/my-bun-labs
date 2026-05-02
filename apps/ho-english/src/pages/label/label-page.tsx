import { type ChangeEvent, useCallback, useMemo, useState } from 'react'

import { ChunkedText } from '../../shared/components/chunked-text'
import { toChunks, tokenize } from '../../shared/text/tokenize'

type Status = 'idle' | 'ocr' | 'ready' | 'error'

export function LabelPage() {
	const [file, setFile] = useState<File | null>(null)
	const [previewUrl, setPreviewUrl] = useState<string | null>(null)
	const [text, setText] = useState('')
	const [boundaries, setBoundaries] = useState<Set<number>>(() => new Set())
	const [status, setStatus] = useState<Status>('idle')
	const [errorMsg, setErrorMsg] = useState('')

	const words = useMemo(() => tokenize(text), [text])
	const chunks = useMemo(() => toChunks(words, boundaries), [words, boundaries])

	const onPickFile = useCallback((event: ChangeEvent<HTMLInputElement>) => {
		const picked = event.target.files?.[0]
		if (!picked) return
		setFile(picked)
		setPreviewUrl((prev) => {
			if (prev) URL.revokeObjectURL(prev)
			return URL.createObjectURL(picked)
		})
		setText('')
		setBoundaries(new Set())
		setStatus('idle')
		setErrorMsg('')
	}, [])

	const onRunOcr = useCallback(async () => {
		if (!file) return
		setStatus('ocr')
		setErrorMsg('')
		try {
			const imageBase64 = await fileToBase64(file)
			const mimeType = file.type || guessMimeType(file.name)
			const res = await fetch('/api/ocr', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ imageBase64, mimeType }),
			})
			if (!res.ok) {
				throw new Error(`HTTP ${res.status} — ${await res.text()}`)
			}
			const data = (await res.json()) as { text: string }
			setText(data.text)
			setBoundaries(new Set())
			setStatus('ready')
		} catch (err) {
			console.error(err)
			setErrorMsg(err instanceof Error ? err.message : String(err))
			setStatus('error')
		}
	}, [file])

	const toggleBoundary = useCallback((index: number) => {
		setBoundaries((prev) => {
			const next = new Set(prev)
			if (next.has(index)) next.delete(index)
			else next.add(index)
			return next
		})
	}, [])

	const onResetBoundaries = useCallback(() => {
		setBoundaries(new Set())
	}, [])

	const onSave = useCallback(() => {
		if (!file || !text) return
		const id = file.name.replace(/\.[^.]+$/, '')
		const payload = {
			id,
			image: `samples/${file.name}`,
			text,
			boundaries: [...boundaries].sort((a, b) => a - b),
			chunks,
			labeled_at: new Date().toISOString(),
		}
		const blob = new Blob([JSON.stringify(payload, null, 2)], {
			type: 'application/json',
		})
		const url = URL.createObjectURL(blob)
		const a = document.createElement('a')
		a.href = url
		a.download = `${id}.chunking.json`
		a.click()
		URL.revokeObjectURL(url)
	}, [file, text, boundaries, chunks])

	return (
		<main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 sm:px-6 sm:py-12">
			<div className="mx-auto max-w-4xl space-y-6">
				<header className="space-y-2">
					<p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
						ho-english · 메타앱
					</p>
					<h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
						끊어읽기 라벨링
					</h1>
					<p className="text-sm text-slate-600">
						사진을 올리면 OCR로 텍스트를 추출합니다. 단어 사이 점(·)을 누르면
						끊어읽기(/)가 표시되고, 다시 누르면 사라집니다. 다 되면 JSON으로
						저장하세요.
					</p>
				</header>

				<section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
					<label className="block text-sm font-medium text-slate-700">
						지문 사진
						<input
							type="file"
							accept="image/*"
							onChange={onPickFile}
							className="mt-2 block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white file:hover:bg-slate-700"
						/>
					</label>

					{previewUrl && (
						<img
							src={previewUrl}
							alt="선택한 지문"
							className="mt-4 max-h-72 w-full rounded-lg object-contain"
						/>
					)}

					<div className="mt-4 flex items-center gap-3">
						<button
							type="button"
							disabled={!file || status === 'ocr'}
							onClick={onRunOcr}
							className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-sky-700 disabled:bg-slate-300"
						>
							{status === 'ocr' ? 'OCR 중…' : 'OCR 시작'}
						</button>
						{status === 'error' && (
							<span className="text-sm text-rose-600">{errorMsg}</span>
						)}
					</div>
				</section>

				{words.length > 0 && (
					<section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
						<div className="mb-4 flex items-center justify-between">
							<h2 className="text-sm font-medium text-slate-700">
								추출된 지문 ({words.length} 단어, 끊어읽기 {boundaries.size}개)
							</h2>
							<button
								type="button"
								onClick={onResetBoundaries}
								className="text-xs text-slate-500 hover:text-slate-900"
							>
								초기화
							</button>
						</div>
						<ChunkedText
							words={words}
							boundaries={boundaries}
							onToggleBoundary={toggleBoundary}
						/>

						{chunks.length > 0 && (
							<details className="mt-6 text-sm text-slate-600">
								<summary className="cursor-pointer">
									청크 미리보기 ({chunks.length}개)
								</summary>
								<ol className="mt-2 list-decimal space-y-1 pl-5">
									{chunks.map((c, i) => (
										// biome-ignore lint/suspicious/noArrayIndexKey: chunks are rebuilt whenever boundaries change; order is the identity.
										<li key={`${i}-${c.text.slice(0, 12)}`}>{c.text}</li>
									))}
								</ol>
							</details>
						)}

						<div className="mt-6 flex justify-end">
							<button
								type="button"
								onClick={onSave}
								className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700"
							>
								JSON 저장
							</button>
						</div>
					</section>
				)}
			</div>
		</main>
	)
}

async function fileToBase64(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader()
		reader.onload = () => {
			const result = reader.result
			if (typeof result !== 'string') {
				reject(new Error('FileReader result is not a string'))
				return
			}
			const comma = result.indexOf(',')
			resolve(comma >= 0 ? result.slice(comma + 1) : result)
		}
		reader.onerror = () => reject(reader.error ?? new Error('FileReader error'))
		reader.readAsDataURL(file)
	})
}

function guessMimeType(name: string): string {
	const ext = name.toLowerCase().split('.').pop() ?? ''
	if (ext === 'heic' || ext === 'heif') return 'image/heic'
	if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg'
	if (ext === 'png') return 'image/png'
	if (ext === 'webp') return 'image/webp'
	return 'application/octet-stream'
}
