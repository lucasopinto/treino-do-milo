import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { App } from './app/App'
import { applyTheme, watchSystemTheme } from './lib/theme'
import { ensureSettings } from './db/repo'
import { registerServiceWorker } from './lib/pwa'

applyTheme()
watchSystemTheme()
void ensureSettings()
registerServiceWorker()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
