/// <reference types="vite/client" />
declare const __APP_VERSION__: string

interface ImportMetaEnv {
  /** Endereço da API (Fase 2). Vazio = o usuário informa na tela Casa. */
  readonly VITE_API_URL?: string
}
