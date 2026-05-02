import { GoogleGenAI, Type } from '@google/genai'
import { Hono } from 'hono'
import { cors } from 'hono/cors'

const MODEL_ID = 'gemini-3-flash-preview'

const apiKey = process.env.GEMINI_API_KEY
if (!apiKey) {
	console.error(
		'GEMINI_API_KEY is missing. Copy .env.example to .env and fill it in.',
	)
	process.exit(1)
}

const ai = new GoogleGenAI({ apiKey })

const ocrPrompt = await Bun.file(`${import.meta.dir}/prompts/ocr.md`).text()

const app = new Hono()

app.use('/api/*', cors())

app.get('/api/health', (c) => c.json({ ok: true, model: MODEL_ID }))

app.post('/api/ocr', async (c) => {
	const body = await c.req.json<{ imageBase64?: string; mimeType?: string }>()
	const { imageBase64, mimeType } = body

	if (!imageBase64 || !mimeType) {
		return c.json({ error: 'imageBase64 and mimeType are required' }, 400)
	}

	const result = await ai.models.generateContent({
		model: MODEL_ID,
		contents: [
			{
				role: 'user',
				parts: [
					{ inlineData: { mimeType, data: imageBase64 } },
					{
						text: 'Extract the English passage from this image and return JSON.',
					},
				],
			},
		],
		config: {
			systemInstruction: ocrPrompt,
			responseMimeType: 'application/json',
			responseSchema: {
				type: Type.OBJECT,
				properties: { text: { type: Type.STRING } },
				required: ['text'],
			},
		},
	})

	const raw = result.text ?? '{"text":""}'
	try {
		const parsed = JSON.parse(raw) as { text: string }
		return c.json({ text: parsed.text })
	} catch (err) {
		console.error('Failed to parse Gemini OCR response:', raw, err)
		return c.json({ error: 'Gemini returned invalid JSON', raw }, 502)
	}
})

const port = Number(process.env.SERVER_PORT ?? 3001)
console.log(`BFF listening on http://localhost:${port} (model: ${MODEL_ID})`)

export default {
	port,
	fetch: app.fetch,
}
