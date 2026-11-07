import { existsSync, readFileSync } from 'node:fs'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import { defineConfig } from 'vite'

// HTTPS opcional para pruebas: si existen `certs/dev.pem` y `certs/dev-key.pem`
// (generados con mkcert, ver certs/LEEME.md), el servidor de desarrollo usa https.
const cert = 'certs/dev.pem'
const key = 'certs/dev-key.pem'
const https = existsSync(cert) && existsSync(key) ? { cert: readFileSync(cert), key: readFileSync(key) } : undefined

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] })
  ],
  server: { https, host: https ? true : undefined },
})
