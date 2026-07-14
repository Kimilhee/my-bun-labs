import basicSsl from '@vitejs/plugin-basic-ssl'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import pkg from './package.json'

// basic-ssl: 폰에서 마이크(Web Speech API)를 쓰려면 HTTPS가 필요해서 dev에만 의미 있음
// base: GitHub Pages 프로젝트 사이트(/my-bun-labs/) 배포 경로
export default defineConfig(({ mode }) => ({
	base: mode === 'production' ? '/my-bun-labs/' : '/',
	define: { __APP_VERSION__: JSON.stringify(pkg.version) },
	plugins: [
		react(),
		basicSsl(),
		VitePWA({
			registerType: 'autoUpdate',
			includeAssets: ['icon.svg', 'apple-touch-icon.png'],
			manifest: {
				name: 'memest — 암송 복습',
				short_name: 'memest',
				description: '성경 암송 복습 게임',
				display: 'standalone',
				background_color: '#111418',
				theme_color: '#111418',
				icons: [
					{ src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
					{ src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
					{
						src: 'icon-512.png',
						sizes: '512x512',
						type: 'image/png',
						purpose: 'maskable',
					},
				],
			},
			workbox: {
				globPatterns: ['**/*.{js,css,html,png,svg,webmanifest}'],
			},
		}),
	],
	server: { host: true },
}))
