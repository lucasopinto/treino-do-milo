import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { MiloDB } from '../db/db'
import { pickNewer } from '../domain/merge'
import type { BaseRecord, Elimination } from '../domain/types'
import type { SyncRecord } from './api'
import { collectOutbox, runSync, type SyncConfig } from './engine'

/** Servidor falso em memória, com a mesma regra da API (o mais recente vence, seq crescente). */
function fakeServer() {
  let seq = 0
  const rows = new Map<string, SyncRecord & { seq: number }>()
  const fetchImpl = (async (url: string, init?: RequestInit) => {
    const u = new URL(url)
    const json = (b: unknown) => new Response(JSON.stringify(b), { status: 200, headers: { 'Content-Type': 'application/json' } })
    if (u.pathname === '/sync/push') {
      const { records } = JSON.parse(String(init?.body)) as { records: SyncRecord[] }
      let accepted = 0
      const corrections: SyncRecord[] = []
      for (const r of records) {
        const k = `${r.collection}/${r.id}`
        const cur = rows.get(k)
        if (cur && pickNewer(cur as unknown as BaseRecord, r as unknown as BaseRecord) !== (r as unknown)) {
          if (cur.updatedAt !== r.updatedAt || cur.deviceId !== r.deviceId) corrections.push(cur)
          continue
        }
        rows.set(k, { ...r, data: { ...r.data, updatedAt: r.updatedAt, deviceId: r.deviceId }, seq: ++seq })
        accepted++
      }
      return json({ accepted, corrections, seq })
    }
    if (u.pathname === '/sync/pull') {
      const since = Number(u.searchParams.get('since'))
      const records = [...rows.values()].filter((r) => r.seq > since).sort((a, b) => a.seq - b.seq)
      return json({ records, seq: records.at(-1)?.seq ?? Math.max(since, seq), hasMore: false })
    }
    return new Response('{}', { status: 404 })
  }) as typeof fetch
  return { fetchImpl, rows }
}

const cfg0: SyncConfig = {
  apiUrl: 'http://api.test',
  token: 't',
  householdId: 'h',
  serverDeviceId: 's',
  cursor: 0,
  pushedUntil: null,
  lastSyncAt: null,
}

function elim(id: string, updatedAt: number, deviceId: string, place: 'fora' | 'dentro' = 'fora'): Elimination {
  return { id, createdAt: 1, updatedAt, deletedAt: null, deviceId, kind: 'xixi', place, room: null, at: 1, note: null, trainerId: 'lucas' }
}

let dbA: MiloDB
let dbB: MiloDB
let n = 0

beforeEach(() => {
  n++
  dbA = new MiloDB(`a-${n}`)
  dbB = new MiloDB(`b-${n}`)
})

afterEach(async () => {
  await dbA.delete()
  await dbB.delete()
})

describe('o que enviar', () => {
  it('na primeira vez envia tudo, menos dados de exemplo', async () => {
    await dbA.eliminations.bulkPut([elim('1', 10, 'A'), elim('2', 20, 'outro'), elim('demo-1', 30, 'demo')])
    const out = await collectOutbox(dbA, { pushedUntil: null }, 'A')
    expect(out.map((r) => r.id).sort()).toEqual(['1', '2'])
  })

  it('depois só o que este aparelho editou desde o último envio', async () => {
    await dbA.eliminations.bulkPut([elim('1', 10, 'A'), elim('2', 50, 'A'), elim('3', 60, 'B')])
    await dbA.settings.put({ id: 'settings', createdAt: 0, updatedAt: 70, deletedAt: null, deviceId: 'A' } as never)
    const out = await collectOutbox(dbA, { pushedUntil: 20 }, 'A')
    expect(out.map((r) => `${r.collection}/${r.id}`).sort()).toEqual(['eliminations/2', 'settings/settings'])
  })
})

describe('dois celulares', () => {
  it('o que um registra chega no outro, e edições voltam', async () => {
    const srv = fakeServer()
    await dbA.eliminations.put(elim('x1', 100, 'A'))

    const a1 = await runSync({ db: dbA, cfg: cfg0, deviceId: 'A', fetchImpl: srv.fetchImpl })
    expect(a1.pushed).toBe(1)
    expect(a1.cfg.pushedUntil).toBe(100)

    const b1 = await runSync({ db: dbB, cfg: cfg0, deviceId: 'B', fetchImpl: srv.fetchImpl })
    expect(b1.pulled).toBe(1)
    expect((await dbB.eliminations.get('x1'))?.place).toBe('fora')

    // B corrige: foi dentro.
    await dbB.eliminations.put({ ...elim('x1', 200, 'B', 'dentro') })
    const b2 = await runSync({ db: dbB, cfg: b1.cfg, deviceId: 'B', fetchImpl: srv.fetchImpl })
    expect(b2.pushed).toBe(1)

    const a2 = await runSync({ db: dbA, cfg: a1.cfg, deviceId: 'A', fetchImpl: srv.fetchImpl })
    expect(a2.pulled).toBe(1)
    expect((await dbA.eliminations.get('x1'))?.place).toBe('dentro')

    // Nada novo: nada enviado, nada recebido.
    const a3 = await runSync({ db: dbA, cfg: a2.cfg, deviceId: 'A', fetchImpl: srv.fetchImpl })
    expect([a3.pushed, a3.pulled]).toEqual([0, 0])
  })

  it('edição antiga perde e o celular fica com a versão do servidor', async () => {
    const srv = fakeServer()
    await dbA.eliminations.put(elim('x1', 300, 'A', 'dentro'))
    await runSync({ db: dbA, cfg: cfg0, deviceId: 'A', fetchImpl: srv.fetchImpl })

    // B editou offline, com horário anterior.
    await dbB.eliminations.put(elim('x1', 250, 'B', 'fora'))
    const b = await runSync({ db: dbB, cfg: cfg0, deviceId: 'B', fetchImpl: srv.fetchImpl })
    expect(b.corrected).toBe(1)
    const local = await dbB.eliminations.get('x1')
    expect([local?.place, local?.updatedAt]).toEqual(['dentro', 300])
  })

  it('receber não apaga edição local mais nova ainda não enviada', async () => {
    const srv = fakeServer()
    await dbA.eliminations.put(elim('x1', 100, 'A', 'fora'))
    await runSync({ db: dbA, cfg: cfg0, deviceId: 'A', fetchImpl: srv.fetchImpl })
    await dbB.eliminations.put(elim('x1', 500, 'B', 'dentro'))
    // Simula só o recebimento (o envio de B ainda não aconteceu): cursor 0, nada a enviar.
    const b = await runSync({ db: dbB, cfg: { ...cfg0, pushedUntil: 1000 }, deviceId: 'B', fetchImpl: srv.fetchImpl })
    expect(b.pulled).toBe(0)
    expect((await dbB.eliminations.get('x1'))?.place).toBe('dentro')
  })

  it('exclusão feita num celular some do outro', async () => {
    const srv = fakeServer()
    await dbA.eliminations.put(elim('x1', 100, 'A'))
    const a1 = await runSync({ db: dbA, cfg: cfg0, deviceId: 'A', fetchImpl: srv.fetchImpl })
    const b1 = await runSync({ db: dbB, cfg: cfg0, deviceId: 'B', fetchImpl: srv.fetchImpl })
    await dbA.eliminations.put({ ...elim('x1', 200, 'A'), deletedAt: 200 })
    await runSync({ db: dbA, cfg: a1.cfg, deviceId: 'A', fetchImpl: srv.fetchImpl })
    await runSync({ db: dbB, cfg: b1.cfg, deviceId: 'B', fetchImpl: srv.fetchImpl })
    expect((await dbB.eliminations.get('x1'))?.deletedAt).toBe(200)
  })
})

describe('erros', () => {
  it('sem internet lança NetworkError', async () => {
    const failing = (async () => {
      throw new TypeError('Failed to fetch')
    }) as typeof fetch
    await expect(runSync({ db: dbA, cfg: cfg0, deviceId: 'A', fetchImpl: failing })).rejects.toMatchObject({ name: 'NetworkError' })
  })

  it('token recusado lança ApiError 401 com a mensagem do servidor', async () => {
    const denied = (async () =>
      new Response(JSON.stringify({ detail: 'Este aparelho não faz mais parte da casa.' }), { status: 401 })) as typeof fetch
    await expect(runSync({ db: dbA, cfg: cfg0, deviceId: 'A', fetchImpl: denied })).rejects.toMatchObject({
      status: 401,
      message: 'Este aparelho não faz mais parte da casa.',
    })
  })
})
