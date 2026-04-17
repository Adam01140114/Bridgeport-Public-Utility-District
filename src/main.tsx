import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import faviconUrl from '../logo.png'

function applyFavicon(url: string) {
  const existing = document.querySelector<HTMLLinkElement>("link[rel='icon']")
  if (existing) {
    existing.href = url
    existing.type = 'image/png'
    return
  }
  const link = document.createElement('link')
  link.rel = 'icon'
  link.type = 'image/png'
  link.href = url
  document.head.appendChild(link)
}

applyFavicon(faviconUrl)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
