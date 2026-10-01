import { useState, type SubmitEvent } from 'react'
import { Navigate, useLocation } from 'react-router'
import { isApiError } from '../api.ts'
import { rutaInicial } from '../routes/accesos.tsx'
import { useAuth } from './auth-context.ts'
import styles from './LoginPage.module.css'

/** Ruta que el usuario quería abrir antes de que lo mandaran al login (la guarda ProtectedRoute). */
function rutaOrigen(state: unknown): string | null {
  if (state && typeof state === 'object' && 'from' in state) {
    const from = (state as { from?: { pathname?: unknown } }).from
    if (typeof from?.pathname === 'string') return from.pathname
  }
  return null
}

export function LoginPage() {
  const { login, status, sesion } = useAuth()
  const location = useLocation()
  const [correo, setCorreo] = useState('')
  const [contra, setContra] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setEnviando(true)
    try {
      await login(correo.trim(), contra)
    } catch (e) {
      setError(isApiError(e) ? e.message : 'No se pudo iniciar sesión')
      setEnviando(false)
    }
  }

  if (status === 'loading') return <p style={{ padding: 24 }}>Cargando…</p>
  if (status === 'authenticated') {
    return <Navigate to={rutaOrigen(location.state) ?? rutaInicial(sesion?.rol ?? null)} replace />
  }

  return (
    <main className={styles.root}>
      <form className={styles.card} onSubmit={handleSubmit}>
        <h1 className={styles.title}>Pizzería Torazo</h1>
        <p className={styles.subtitle}>Inicia sesión para continuar</p>

        <label className={styles.field}>
          <span>Correo</span>
          <input
            type="email"
            autoComplete="username"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            required
            autoFocus
          />
        </label>

        <label className={styles.field}>
          <span>Contraseña</span>
          <input
            type="password"
            autoComplete="current-password"
            value={contra}
            onChange={(e) => setContra(e.target.value)}
            required
          />
        </label>

        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}

        <button className={styles.submit} type="submit" disabled={enviando}>
          {enviando ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </main>
  )
}