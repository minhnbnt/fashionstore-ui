/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GOTRUE_URL: string
  readonly VITE_API_URL: string
  readonly VITE_ASSETS_URL: string
  readonly VITE_USE_MOCK: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
