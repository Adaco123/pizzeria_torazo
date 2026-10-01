import { NavLink, Outlet } from 'react-router'
import { useAuth } from '../auth/auth-context.ts'
import { ACCESOS } from './accesos.tsx'
import styles from './AppLayout.module.css'

export function AppLayout() {
  const { sesion, logout, hasRole } = useAuth()
  // El menú solo muestra lo que el rol puede abrir.
  const enlaces = ACCESOS.filter((acceso) => hasRole(...acceso.roles))

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <strong className={styles.brand}>Pizzería Torazo</strong>

        <nav className={styles.nav}>
          {enlaces.map((acceso) => (
            <NavLink
              key={acceso.path}
              to={acceso.path}
              className={({ isActive }) =>
                isActive ? `${styles.link} ${styles.linkActive}` : styles.link
              }
            >
              {acceso.label}
            </NavLink>
          ))}
        </nav>

        <div className={styles.user}>
          <span>
            {sesion?.nombre} · {sesion?.rol ?? 'sin rol'}
          </span>
          <button className={styles.logout} type="button" onClick={logout}>
            Cerrar sesión
          </button>
        </div>
      </header>

      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  )
}