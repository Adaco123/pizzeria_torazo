import { isRouteErrorResponse, useRouteError } from 'react-router'
import { useAuth } from '../auth/auth-context.ts'
import styles from './ErrorPage.module.css'

function descripcion(error: unknown): string {
  if (isRouteErrorResponse(error)) return `${error.status} ${error.statusText}`
  if (error instanceof Error) return error.message
  return 'Error desconocido'
}

/** Pantalla que se muestra si algo falla al dibujar una página (en lugar de la pantalla de error genérica). */
export function ErrorPage() {
  const error = useRouteError()
  const { logout } = useAuth()

  function cerrarSesion() {
    logout()
    // Recarga completa: así también se descarta el estado de error del router.
    window.location.assign('/login')
  }

  return (
    <main className={styles.root}>
      <div className={styles.card} role="alert">
        <h1>Algo salió mal</h1>
        <p>Ocurrió un error inesperado en esta pantalla. Puedes volver al inicio o cerrar sesión.</p>

        <details className={styles.detalle}>
          <summary>Detalle técnico</summary>
          <pre>{descripcion(error)}</pre>
        </details>

        <div className={styles.acciones}>
          <a className={styles.primary} href="/">
            Volver al inicio
          </a>
          <button className={styles.secondary} type="button" onClick={cerrarSesion}>
            Cerrar sesión
          </button>
        </div>
      </div>
    </main>
  )
}