import { House, LogOut, TriangleAlert } from 'lucide-react'
import { isRouteErrorResponse, useRouteError } from 'react-router'
import { useAuth } from '../auth/auth-context.ts'
import ui from '../features/admin/Ui.module.css'
import styles from './ErrorPage.module.css'
import { PaginaMensaje } from './PaginaMensaje.tsx'

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
    <PaginaMensaje
      pantallaCompleta
      alerta
      icono={TriangleAlert}
      titulo="Algo salió mal"
      acciones={
        <>
          <a className={`${ui.btn} ${ui.primario}`} href="/">
            <House size={16} aria-hidden="true" /> Volver al inicio
          </a>
          <button className={`${ui.btn} ${ui.secundario}`} type="button" onClick={cerrarSesion}>
            <LogOut size={16} aria-hidden="true" /> Cerrar sesión
          </button>
        </>
      }
    >
      <p>Ocurrió un error inesperado en esta pantalla. Puedes volver al inicio o cerrar sesión.</p>
      <details className={styles.detalle}>
        <summary>Detalle técnico</summary>
        <pre>{descripcion(error)}</pre>
      </details>
    </PaginaMensaje>
  )
}
