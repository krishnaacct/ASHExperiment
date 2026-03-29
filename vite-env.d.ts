/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GAS_PROD_URL: string
  readonly VITE_GAS_STAGING_URL: string
  readonly VITE_GEMINI_API_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
