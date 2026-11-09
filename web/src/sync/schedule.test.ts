import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../db/db'
import { defaultSettings } from '../db/repo'
import { deviceTimeZone, getOwnSchedule, onScheduleChange, saveOwnSchedule, uploadScheduleIfChanged } from './schedule'

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

beforeEach(async () => {
  store.clear()
  await db.settings.clear()
})

describe('agenda de saídas por celular', () => {
  it('na primeira vez, copia a agenda das configurações para este celular e manda ao servidor com o fuso', async () => {
    const s = defaultSettings()
    await db.settings.put({ ...s, outingTimes: [{ id: 'a', time: '07:00', label: 'Manhã' }] })
    const srv = fakeServer()
    await uploadScheduleIfChanged({ baseUrl: 'https://api.test', token: 'tok-lucas', fetchImpl: srv.fetchImpl })

    expect(getOwnSchedule()?.outingTimes).toEqual([{ id: 'a', time: '07:00', label: 'Manhã' }])
    expect(srv.calls).toEqual([
      {
        method: 'PUT',
        path: '/devices/me/schedule',
        body: { outingTimes: [{ id: 'a', time: '07:00', label: 'Manhã' }], remindersEnabled: true, timezone: deviceTimeZone() },
      },
    ])
  })

  it('a agenda própria não muda quando as configurações da casa mudam (vindas do outro celular)', async () => {
    saveOwnSchedule({ outingTimes: [{ id: 'p', time: '08:00', label: 'Lisboa' }], remindersEnabled: true })
    await db.settings.put({ ...defaultSettings(), outingTimes: [{ id: 'b', time: '06:00', label: 'Brasil' }] })
    const srv = fakeServer()
    await uploadScheduleIfChanged({ baseUrl: 'https://api.test', token: 'tok-pai', fetchImpl: srv.fetchImpl })
    expect((srv.calls[0]!.body as { outingTimes: { time: string }[] }).outingTimes[0]!.time).toBe('08:00')
  })

  it('só manda de novo quando a agenda muda', async () => {
    saveOwnSchedule({ outingTimes: [{ id: 'a', time: '07:00', label: 'Manhã' }], remindersEnabled: true })
    const srv = fakeServer()
    const conn = { baseUrl: 'https://api.test', token: 'tok-lucas', fetchImpl: srv.fetchImpl }
    await uploadScheduleIfChanged(conn)
    await uploadScheduleIfChanged(conn)
    expect(srv.calls).toHaveLength(1)

    saveOwnSchedule({ outingTimes: [{ id: 'a', time: '07:15', label: 'Manhã' }], remindersEnabled: false })
    await uploadScheduleIfChanged(conn)
    expect(srv.calls).toHaveLength(2)
    expect(srv.calls[1]!.body).toMatchObject({ remindersEnabled: false, outingTimes: [{ time: '07:15' }] })
  })

  it('entrou noutra casa (token novo): manda de novo', async () => {
    saveOwnSchedule({ outingTimes: [], remindersEnabled: true })
    const srv = fakeServer()
    await uploadScheduleIfChanged({ baseUrl: 'https://api.test', token: 'tok-casa-1', fetchImpl: srv.fetchImpl })
    await uploadScheduleIfChanged({ baseUrl: 'https://api.test', token: 'tok-casa-2', fetchImpl: srv.fetchImpl })
    expect(srv.calls).toHaveLength(2)
  })

  it('servidor ainda sem a rota (404): não atrapalha a sincronização e tenta de novo depois', async () => {
    saveOwnSchedule({ outingTimes: [], remindersEnabled: true })
    const fora = fakeServer(404)
    await expect(uploadScheduleIfChanged({ baseUrl: 'https://api.test', token: 't', fetchImpl: fora.fetchImpl })).resolves.toBeUndefined()
    const ok = fakeServer()
    await uploadScheduleIfChanged({ baseUrl: 'https://api.test', token: 't', fetchImpl: ok.fetchImpl })
    expect(ok.calls).toHaveLength(1)
  })

  it('celular removido da casa (401): o erro sobe para o sincronizador tratar', async () => {
    saveOwnSchedule({ outingTimes: [], remindersEnabled: true })
    const srv = fakeServer(401)
    await expect(uploadScheduleIfChanged({ baseUrl: 'https://api.test', token: 't', fetchImpl: srv.fetchImpl })).rejects.toMatchObject({ status: 401 })
  })

  it('avisa quem está ouvindo quando a agenda muda', () => {
    const fn = vi.fn()
    const off = onScheduleChange(fn)
    saveOwnSchedule({ outingTimes: [], remindersEnabled: true })
    off()
    saveOwnSchedule({ outingTimes: [], remindersEnabled: false })
    expect(fn).toHaveBeenCalledTimes(1)
  })
})
