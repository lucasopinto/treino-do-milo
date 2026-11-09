import { beforeEach, describe, expect, it } from 'vitest'
import { db } from './db'
import { addElimination, addSession, ensureSettings, updateSettings } from './repo'
import { exportBackup, importBackup, validateBackup, wipeAll } from './backup'
import { buildDemo, hasDemo, loadDemo, removeDemo } from '../seed/demo'

const sessionData = {
  skillId: 'senta' as const,
  levelIndex: 0,
  trainerId: 'lucas',
  startedAt: 1,
  endedAt: 2,
  plannedSec: 300,
  actualSec: 300,
  hits: 8,
  misses: 2,
  clicks: 0,
}

beforeEach(async () => {
  await wipeAll()
})

describe('backup', () => {
  it('exporta e importa (substituir) sem perder nada', async () => {
    await ensureSettings()
    await updateSettings({ dogName: 'Milo Teste' })
    await addSession(sessionData)
    await addElimination({ kind: 'xixi', place: 'fora', room: null, at: 5, note: 'ok', trainerId: 'pai' })
    const file = validateBackup(JSON.parse(JSON.stringify(await exportBackup())))
    await wipeAll()
    expect(await db.sessions.count()).toBe(0)
    await importBackup(file, 'substituir')
    expect(await db.sessions.count()).toBe(1)
    expect((await db.eliminations.toArray())[0]!.note).toBe('ok')
    expect((await db.settings.get('settings'))!.dogName).toBe('Milo Teste')
  })

  it('mesclar mantém dados dos dois celulares e o mais recente vence', async () => {
    const s = await addSession(sessionData)
    const file = await exportBackup()
    // Celular A edita depois; celular B tinha outra sessão.
    await db.sessions.update(s.id, { hits: 10, updatedAt: s.updatedAt + 1000 })
    const other = { ...s, id: 'outra', hits: 3 }
    file.data.sessions.push(other)
    const r = await importBackup(file, 'mesclar')
    expect(r).toMatchObject({ added: 1, unchanged: 1 })
    expect((await db.sessions.get(s.id))!.hits).toBe(10)
    expect(await db.sessions.count()).toBe(2)
  })

  it('recusa arquivos que não são backup', () => {
    expect(() => validateBackup({ foo: 1 })).toThrow('não é um backup')
    expect(() => validateBackup({ app: 'treino-do-milo', version: 99, data: {} })).toThrow('versão mais nova')
    expect(() => validateBackup({ app: 'treino-do-milo', version: 1, data: { sessions: [{ x: 1 }] } })).toThrow('inválidos')
  })
})

describe('dados de exemplo', () => {
  it('gera 4 semanas com acidentes diminuindo', () => {
    const now = new Date(2026, 10, 9, 20)
    const d = buildDemo(now)
    const accidents = (from: number, to: number) =>
      d.eliminations.filter((e) => e.place === 'dentro' && e.at >= now.getTime() - from * 86_400_000 && e.at < now.getTime() - to * 86_400_000).length
    expect(d.sessions.length).toBeGreaterThan(50)
    expect(accidents(28, 14)).toBeGreaterThan(accidents(14, 0))
    expect(d.eliminations.every((e) => e.at <= now.getTime())).toBe(true)
  })

  it('carrega e remove sem tocar nos dados reais', async () => {
    const real = await addSession(sessionData)
    await loadDemo()
    expect(await hasDemo()).toBe(true)
    await removeDemo()
    expect(await hasDemo()).toBe(false)
    expect(await db.sessions.get(real.id)).toBeDefined()
    expect(await db.sessions.count()).toBe(1)
  })
})
