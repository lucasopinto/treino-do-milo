import { defineConfig } from 'vitest/config'

// Fuso fixo para os testes de datas darem o mesmo resultado em qualquer máquina.
process.env.TZ = 'America/Sao_Paulo'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    setupFiles: ['./src/test-setup.ts'],
  },
})
