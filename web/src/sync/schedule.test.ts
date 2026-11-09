import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../db/db'
import { defaultSettings } from '../db/repo'
import { localTimeZone } from '../domain/schedule'
import type { Settings } from '../domain/types'
import { getDeviceOwner, onScheduleChange, profileSchedule, setDeviceOwner, updateTrainer, uploadScheduleIfChanged } from './schedule'

// localStorage de mentira (os testes rodam no Node).
const store = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
})

function fakeServer(status = 204) {
  const calls: { method: string; path: string; body: unknown }[] = []
  const fetchImpl = (async (url: string, init: RequestInit) => {
    calls.push({ method: String(init.method), path: new URL(url).pathname, body: JSON.parse(String(init.body)) })
    return new Response(status === 204 ? null : JSON.stringify({ detail: 'x' }), { status })
  }) as unknown as typeof fetch
  return { calls, fetchImpl }
}

const settings = async () => (await db.settings.get('settings'))!

beforeEach(async () => {
  store.clear()
  await db.settings.clear()
  const s = defaultSettings()
  await db.settings.put({
    ...s,
    trainers: [
      { id: 'lucas', name: 'Lucas' },
      { id: 'pai', name: 'Pai' },
    ],
    outingTimes: [{ id: 'casa', time: '06:45', label: 'Ao acordar' }],
  } as Settings)
})

describe('agenda de saídas por perfil', () => {
  it('sem agenda própria, o perfil usa a agenda antiga da casa', async () => {
    expect(profileSchedule(await settings(), 'pai').outingTimes).toEqual([{ id: 'casa', time: '06:45', label: 'Ao acordar' }])
  })

  it('cada perfil tem agenda e fuso próprios; mudar a do pai não mexe na do Lucas', async () => {
    await updateTrainer('pai', { outingTimes: [{ id: 'p', time: '22:30', label: 'Antes de dormir' }], timezone: 'Europe/Lisbon' })
    const s = await settings()
    expect(profileSchedule(s, 'pai')).toMatchObject({ timezone: 'Europe/Lisbon', outingTimes: [{ time: '22:30' }] })
    expect(profileSchedule(s, 'lucas').outingTimes).toEqual([{ id: 'casa', time: '06:45', label: 'Ao acordar' }])
  })

  it('escolher o dono do celular dá ao perfil o fuso deste celular (se ainda não tiver)', async () => {
    await setDeviceOwner('pai')
    expect(getDeviceOwner()).toBe('pai')
    expect(profileSchedule(await settings(), 'pai').timezone).toBe(localTimeZone())
    // Já tinha fuso: não troca (ex.: o Lucas escolheu Lisboa para o pai antes).
    await updateTrainer('lucas', { timezone: 'Europe/Lisbon' })
    await setDeviceOwner('lucas')
    expect(profileSchedule(await settings(), 'lucas').timezone).toBe('Europe/Lisbon')
  })

  it('a agenda por celular da versão anterior vira a agenda do dono', async () => {
    store.set('milo.outingSchedule', JSON.stringify({ outingTimes: [{ id: 'x', time: '08:00', label: 'Lisboa' }], remindersEnabled: false }))
    await setDeviceOwner('pai')
    const pai = profileSchedule(await settings(), 'pai')
    expect(pai.outingTimes).toEqual([{ id: 'x', time: '08:00', label: 'Lisboa' }])
    expect(pai.remindersEnabled).toBe(false)
    expect(store.has('milo.outingSchedule')).toBe(false)
  })

  it('manda ao servidor a agenda e o fuso do dono do celular, e só quando mudam', async () => {
    await updateTrainer('pai', { outingTimes: [{ id: 'p', time: '22:30', label: 'Antes de dormir' }], timezone: 'Europe/Lisbon' })
    await setDeviceOwner('pai')
    const srv = fakeServer()
    const conn = { baseUrl: 'https://api.test', token: 'tok-pai', fetchImpl: srv.fetchImpl }
    await uploadScheduleIfChanged(conn)
    await uploadScheduleIfChanged(conn)
    expect(srv.calls).toEqual([
      {
        method: 'PUT',
        path: '/devices/me/schedule',
        body: { outingTimes: [{ id: 'p', time: '22:30', label: 'Antes de dormir' }], remindersEnabled: true, timezone: 'Europe/Lisbon' },
      },
    ])
    await updateTrainer('pai', { remindersEnabled: false })
    await uploadScheduleIfChanged(conn)
    expect(srv.calls).toHaveLength(2)
    // Mudar a agenda de OUTRA pessoa não muda o que este celular manda.
    await updateTrainer('lucas', { outingTimes: [] })
    await uploadScheduleIfChanged(conn)
    expect(srv.calls).toHaveLength(2)
  })

  it('sem dono escolhido, não manda nada', async () => {
    const srv = fakeServer()
    await uploadScheduleIfChanged({ baseUrl: 'https://api.test', token: 't', fetchImpl: srv.fetchImpl })
    expect(srv.calls).toHaveLength(0)
  })

  it('entrou noutra casa (token novo): manda de novo', async () => {
    await setDeviceOwner('lucas')
    const srv = fakeServer()
    await uploadScheduleIfChanged({ baseUrl: 'https://api.test', token: 'tok-casa-1', fetchImpl: srv.fetchImpl })
    await uploadScheduleIfChanged({ baseUrl: 'https://api.test', token: 'tok-casa-2', fetchImpl: srv.fetchImpl })
    expect(srv.calls).toHaveLength(2)
  })

  it('servidor ainda sem a rota (404): não atrapalha e tenta de novo depois; 401 sobe', async () => {
    await setDeviceOwner('lucas')
    await expect(uploadScheduleIfChanged({ baseUrl: 'https://api.test', token: 't', fetchImpl: fakeServer(404).fetchImpl })).resolves.toBeUndefined()
    const ok = fakeServer()
    await uploadScheduleIfChanged({ baseUrl: 'https://api.test', token: 't', fetchImpl: ok.fetchImpl })
    expect(ok.calls).toHaveLength(1)
    await updateTrainer('lucas', { remindersEnabled: false })
    await expect(uploadScheduleIfChanged({ baseUrl: 'https://api.test', token: 't', fetchImpl: fakeServer(401).fetchImpl })).rejects.toMatchObject({
      status: 401,
    })
  })

  it('avisa quem está ouvindo quando o dono muda', async () => {
    const fn = vi.fn()
    const off = onScheduleChange(fn)
    await setDeviceOwner('pai')
    off()
    await setDeviceOwner('lucas')
    expect(fn).toHaveBeenCalledTimes(1)
  })
})
