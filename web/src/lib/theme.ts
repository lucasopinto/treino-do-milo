import { readLocal, writeLocal } from './storage'

export type ThemePref = 'auto' | 'claro' | 'escuro'

const media = () => window.matchMedia('(prefers-color-scheme: dark)')

export function getThemePref(): ThemePref {
  const v = readLocal('milo.theme')
  return v === 'claro' || v === 'escuro' ? v : 'auto'
}

export function applyTheme(pref: ThemePref = getThemePref()): void {
  const dark = pref === 'escuro' || (pref === 'auto' && media().matches)
  document.documentElement.classList.toggle('dark', dark)
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#1c1917' : '#c2410c')
}

export function setThemePref(pref: ThemePref): void {
  writeLocal('milo.theme', pref)
  applyTheme(pref)
}

export function watchSystemTheme(): () => void {
  const m = media()
  const handler = () => applyTheme()
  m.addEventListener('change', handler)
  return () => m.removeEventListener('change', handler)
}
