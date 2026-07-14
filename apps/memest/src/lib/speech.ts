// Web Speech API (STT) 래퍼. TS DOM lib에 타입이 없어 최소 타입을 직접 선언.

type SRAlternative = { transcript: string }
type SRResult = { isFinal: boolean; 0: SRAlternative }
type SREvent = {
	resultIndex: number
	results: { length: number; [i: number]: SRResult }
}
type SR = {
	lang: string
	continuous: boolean
	interimResults: boolean
	onresult: ((e: SREvent) => void) | null
	onend: (() => void) | null
	onerror: ((e: { error: string }) => void) | null
	start(): void
	stop(): void
}

function getCtor(): (new () => SR) | undefined {
	const w = window as unknown as {
		SpeechRecognition?: new () => SR
		webkitSpeechRecognition?: new () => SR
	}
	return w.SpeechRecognition ?? w.webkitSpeechRecognition
}

export const speechSupported = () =>
	Boolean(getCtor()) && window.isSecureContext

export type RecognizerHandle = {
	stop: () => void // 종료하고 onDone으로 채점
	cancel: () => void // 조용히 폐기 (카드 전환 등 — onDone 호출 안 함)
}

/**
 * 한국어 연속 인식 시작. onUpdate는 인식 중간중간, onDone은 stop() 후 최종 전문으로 호출.
 *
 * 안드로이드 Chrome 대응 두 가지:
 * - 매 이벤트마다 results 전체를 0부터 재조립 (안드로이드는 resultIndex를 항상 0으로
 *   주고 전체를 반복 전송해서, 누적 방식은 같은 앞부분이 계속 이어붙는다)
 * - 짧은 침묵에도 조기 종료되므로, stop() 전까지는 세그먼트를 저장하고 자동 재시작
 */
export function startRecognition(
	onUpdate: (transcript: string) => void,
	onDone: (transcript: string) => void,
	onError: (message: string) => void,
): RecognizerHandle | null {
	const Ctor = getCtor()
	if (!Ctor) return null
	const rec = new Ctor()
	rec.lang = 'ko-KR'
	rec.continuous = true
	rec.interimResults = true

	let committed = '' // 자동 재시작 이전 세그먼트들의 누적
	let current = '' // 현재 세그먼트 (매번 전체 재조립)
	let stopping = false
	let cancelled = false
	const full = () => `${committed} ${current}`.trim()

	rec.onresult = (e) => {
		let text = ''
		for (let i = 0; i < e.results.length; i++) {
			const r = e.results[i]
			if (r) text += r[0].transcript
		}
		current = text
		onUpdate(full())
	}
	rec.onerror = (e) => {
		if (e.error === 'no-speech' || e.error === 'aborted') return // 무음/중단은 onend에서 처리
		onError(e.error)
	}
	rec.onend = () => {
		if (cancelled) return
		committed = full()
		current = ''
		if (stopping) {
			onDone(committed)
			return
		}
		try {
			rec.start() // 조기 종료 → 이어서 듣기
		} catch {
			onDone(committed)
		}
	}

	try {
		rec.start()
	} catch {
		onError('start-failed')
		return null
	}
	const end = (quiet: boolean) => {
		stopping = true
		cancelled = quiet
		try {
			rec.stop()
		} catch {
			// 이미 종료된 상태면 무시
		}
	}
	return { stop: () => end(false), cancel: () => end(true) }
}

/** 통과음 "삥뽕" */
export function playPass() {
	try {
		const ctx = new AudioContext()
		const play = (freq: number, at: number) => {
			const osc = ctx.createOscillator()
			const gain = ctx.createGain()
			osc.type = 'sine'
			osc.frequency.value = freq
			gain.gain.setValueAtTime(0.001, ctx.currentTime + at)
			gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + at + 0.02)
			gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + at + 0.25)
			osc.connect(gain).connect(ctx.destination)
			osc.start(ctx.currentTime + at)
			osc.stop(ctx.currentTime + at + 0.3)
		}
		play(880, 0)
		play(1318.5, 0.15)
		setTimeout(() => ctx.close(), 700)
	} catch {
		// 소리는 부가 기능 — 실패해도 무시
	}
}
