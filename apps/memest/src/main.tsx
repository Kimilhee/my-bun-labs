import { createRoot } from 'react-dom/client'
import { App } from './app'
import './app.css'

import { registerSW } from 'virtual:pwa-register'

const root = document.getElementById('root')
if (root) createRoot(root).render(<App />)

registerSW({ immediate: true })
