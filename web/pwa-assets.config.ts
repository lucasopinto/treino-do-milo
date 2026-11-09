import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

export default defineConfig({
  preset: {
    ...minimal2023Preset,
    maskable: { ...minimal2023Preset.maskable, resizeOptions: { background: '#c2410c' } },
    apple: { ...minimal2023Preset.apple, resizeOptions: { background: '#c2410c' } },
  },
  images: ['public/favicon.svg'],
})
