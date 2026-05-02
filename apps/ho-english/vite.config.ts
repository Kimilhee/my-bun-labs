import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const SERVER_PORT = process.env.SERVER_PORT ?? '3001'

export default defineConfig({
	plugins: [react(), tailwindcss()],
	server: {
		host: true,
		proxy: {
			'/api': `http://localhost:${SERVER_PORT}`,
		},
	},
})
