import { Eye, EyeOff, Lock, Mail, Pizza, TriangleAlert } from 'lucide-react'
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
  const [verContra, setVerContra] = useState(false)

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
      <div className={styles.marca}>
        <span className={styles.logo}>
          <Pizza size={34} aria-hidden="true" />
        </span>
        <h1>Pizzería Torazo</h1>
        <p>Pedidos, mesas, cocina y caja en un solo lugar.</p>
      </div>

      <form className={styles.form} onSubmit={handleSubmit}>
        <div>
          <h2 className={styles.title}>Inicia sesión</h2>
          <p className={styles.subtitle}>Usa tu correo y tu contraseña.</p>
        </div>

        <label className={styles.field}>
          <span>Correo</span>
          <span className={styles.entrada}>
            <Mail size={16} aria-hidden="true" />
            <input
              type="email"
              autoComplete="username"
              placeholder="tu@correo.com"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              required
              autoFocus
            />
          </span>
        </label>

        <label className={styles.field}>
          <span>Contraseña</span>
          <span className={styles.entrada}>
            <Lock size={16} aria-hidden="true" />
            <input
              type={verContra ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="••••••••"
              value={contra}
              onChange={(e) => setContra(e.target.value)}
              required
            />
            <button
              className={styles.ojo}
              type="button"
              aria-label={verContra ? 'Ocultar la contraseña' : 'Mostrar la contraseña'}
              aria-pressed={verContra}
              onClick={() => setVerContra((v) => !v)}
            >
              {verContra ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
            </button>
          </span>
        </label>

        {error && (
          <p className={styles.error} role="alert">
            <TriangleAlert size={16} aria-hidden="true" /> {error}
          </p>
        )}

        <button className={styles.submit} type="submit" disabled={enviando}>
          {enviando ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </main>
  )
}
