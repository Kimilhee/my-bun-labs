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

export type RecognizerHandle = { stop: () => void }

/**
 * 한국어 연속 인식 시작. onUpdate는 인식 중간중간(확정+중간 결과 합친 전문),
 * onDone은 인식이 완전히 끝났을 때 최종 전문으로 호출된다.
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

	let finalText = ''
	let ended = false

	rec.onresult = (e) => {
		let interim = ''
		for (let i = e.resultIndex; i < e.results.length; i++) {
			const r = e.results[i]
			if (!r) continue
			if (r.isFinal) finalText += r[0].transcript
			else interim += r[0].transcript
		}
		onUpdate((finalText + interim).trim())
	}
	rec.onerror = (e) => {
		if (e.error === 'no-speech' || e.error === 'aborted') return // 무음/중단은 onend에서 처리
		onError(e.error)
	}
	rec.onend = () => {
		if (ended) return
		ended = true
		onDone(finalText.trim())
	}

	try {
		rec.start()
	} catch {
		onError('start-failed')
		return null
	}
	return { stop: () => rec.stop() }
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
