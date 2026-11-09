// Cliente da API (Fase 2). Endereço padrão vem de VITE_API_URL no build; pode ser trocado na tela Casa.

import type { BaseRecord } from '../domain/types'
import type { SyncedTable } from '../db/db'

export const DEFAULT_API_URL: string = (import.meta.env.VITE_API_URL as string | undefined) ?? ''

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

/** Sem internet ou servidor fora do ar. */
export class NetworkError extends Error {
  constructor() {
    super('Sem conexão com o servidor.')
    this.name = 'NetworkError'
  }
}

export interface ApiOptions {
  baseUrl: string
  token?: string | null
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  body?: unknown
  /** O servidor grátis pode levar ~1 min para acordar; criar/entrar na casa espera mais. */
  timeoutMs?: number
  fetchImpl?: typeof fetch
}

export function normalizeBaseUrl(url: string): string {
  return url.trim().replace(/\/+$/, '')
}

export async function api<T>(path: string, opts: ApiOptions): Promise<T> {
  const { baseUrl, token, method = 'GET', body, timeoutMs = 30_000, fetchImpl = fetch } = opts
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  let res: Response
  try {
    res = await fetchImpl(`${normalizeBaseUrl(baseUrl)}${path}`, {
      method,
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: ctrl.signal,
    })
  } catch {
    throw new NetworkError()
  } finally {
    clearTimeout(timer)
  }
  if (res.status === 204) return undefined as T
  let json: unknown = null
  try {
    json = await res.json()
  } catch {
    /* corpo vazio */
  }
  if (!res.ok) {
    const detail = (json as { detail?: unknown } | null)?.detail
    const msg = typeof detail === 'string' ? detail : `Erro ${res.status} no servidor.`
    throw new ApiError(res.status, msg)
  }
  return json as T
}

// ---------- Tipos das respostas ----------

export interface InviteOut {
  code: string
  expiresAt: number
}

export interface AuthOut {
  token: string
  householdId: string
  deviceId: string
  invite: InviteOut | null
}

export interface DeviceOut {
  id: string
  name: string
  createdAt: number
  lastSeenAt: number
  isMe: boolean
  hasPush: boolean
}

export interface HouseholdOut {
  householdId: string
  createdAt: number
  deviceId: string
  devices: DeviceOut[]
}

export interface SyncRecord {
  collection: SyncedTable
  id: string
  updatedAt: number
  deviceId: string
  data: BaseRecord & Record<string, unknown>
}

export interface PushOut {
  accepted: number
  corrections: SyncRecord[]
  seq: number
}

export interface PullOut {
  records: SyncRecord[]
  seq: number
  hasMore: boolean
}
