// Acesso seguro ao localStorage (pode falhar em aba anônima ou com dados bloqueados).
// Só para preferências do aparelho; os dados do treino ficam no IndexedDB.

export function readLocal(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

export function writeLocal(key: string, value: string | null): void {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, value)
  } catch {
    /* ignora */
  }
}

export function readLocalJson<T>(key: string): T | null {
  const raw = readLocal(key)
  if (!raw) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

export function writeLocalJson(key: string, value: unknown): void {
  writeLocal(key, value === null ? null : JSON.stringify(value))
}
