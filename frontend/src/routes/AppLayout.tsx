import { LogOut, Moon, Sun } from 'lucide-react'
import { NavLink, Outlet } from 'react-router'
import { useAuth } from '../auth/auth-context.ts'
import { useTema } from '../hooks/useTema.ts'
import { ACCESOS } from './accesos.tsx'
import styles from './AppLayout.module.css'
import type { ContextoLayout } from './useAccesosDelRol.ts'

export function AppLayout() {
  const { sesion, logout, hasRole } = useAuth()
  const { tema, alternar } = useTema()
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
          <span className={styles.avatar} aria-hidden="true">
            {sesion?.nombre.trim().charAt(0).toUpperCase()}
          </span>
          <span className={styles.quien}>
            <b>{sesion?.nombre}</b>
            <small>{sesion?.rol ?? 'sin rol'}</small>
          </span>
          <button
            className={styles.tema}
            type="button"
            title={tema === 'oscuro' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
            aria-label={tema === 'oscuro' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
            onClick={alternar}
          >
            {tema === 'oscuro' ? <Sun size={16} aria-hidden="true" /> : <Moon size={16} aria-hidden="true" />}
          </button>
          <button className={styles.logout} type="button" title="Cerrar sesión" aria-label="Cerrar sesión" onClick={logout}>
            <LogOut size={16} aria-hidden="true" /> Salir
          </button>
        </div>
      </header>

      <main className={styles.main}>
        <Outlet context={{ accesos: enlaces } satisfies ContextoLayout} />
      </main>
    </div>
  )
}