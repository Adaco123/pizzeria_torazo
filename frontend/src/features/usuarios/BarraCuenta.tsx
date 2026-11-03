import { LogOut } from 'lucide-react'
import { useAuth } from '../../auth/auth-context.ts'
import styles from './Cuenta.module.css'

/** Barra superior de «Mi cuenta»: título, quién es el usuario y cerrar sesión. */
export function BarraCuenta() {
  const { sesion, logout } = useAuth()
  const nombre = sesion?.nombre ?? ''

  return (
    <div className={styles.barra}>
      <h1 className={styles.titulo}>Mi cuenta</h1>
      <span className={styles.usuario}>
        <span className={styles.inicial} aria-hidden="true">
          {nombre.trim().charAt(0).toUpperCase() || '?'}
        </span>
        <span>
          {nombre} · <span className={styles.rol}>{sesion?.rol ?? 'sin rol'}</span>
        </span>
      </span>
      <div className={styles.espacio} />
      <button className={styles.ghost} type="button" onClick={logout}>
        <LogOut size={16} aria-hidden="true" />
        Cerrar sesión
      </button>
    </div>
  )
}
