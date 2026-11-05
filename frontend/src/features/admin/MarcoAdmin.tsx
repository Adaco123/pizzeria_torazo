import { ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { NavLink } from 'react-router'
import base from '../pedidos/Pedidos.module.css'
import styles from './Admin.module.css'
import { INICIO_ADMIN, SECCIONES_ADMIN } from './secciones.ts'

interface Props {
  /** Título de la pantalla. Si no se pasa, es el nombre de la sección. */
  titulo?: string
  /** Ruta de la sección abierta, o nada en el inicio. */
  seccion?: string
  /** Texto de ayuda que va arriba del contenido. */
  descripcion?: ReactNode
  children: ReactNode
}

/**
 * Marco común del panel de administración, con el esquema de Pedidos:
 * barra arriba, riel de secciones a la izquierda y el contenido al lado.
 */
export function MarcoAdmin({ titulo, seccion, descripcion, children }: Props) {
  const actual = SECCIONES_ADMIN.find((s) => s.path === seccion)

  return (
    <section className={`${base.page} ${base.pageAncha}`}>
      <div className={styles.barra}>
        <h1 className={styles.titulo}>{titulo ?? actual?.label ?? 'Administración'}</h1>
        <span className={styles.pildora}>
          {actual ? (
            <>
              Administración › <b>{actual.label}</b>
            </>
          ) : (
            <>
              <b>{SECCIONES_ADMIN.length}</b> secciones
            </>
          )}
        </span>
      </div>

      <div className={styles.layout}>
        <nav className={styles.riel} aria-label="Secciones de administración">
          <div className={styles.rielCabeza}>
            <h2>Administración</h2>
          </div>
          <ul className={styles.lista}>
            {[INICIO_ADMIN, ...SECCIONES_ADMIN].map((s) => (
              <li key={s.path}>
                <NavLink
                  to={s.path}
                  end={s.path === INICIO_ADMIN.path}
                  className={({ isActive }) => (isActive ? `${styles.seccion} ${styles.elegida}` : styles.seccion)}
                >
                  <span className={styles.datos}>
                    <b>{s.label}</b>
                    <small>{s.corta}</small>
                  </span>
                  <ChevronRight size={16} aria-hidden="true" />
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className={styles.centro}>
          {descripcion && <p className={base.muted}>{descripcion}</p>}
          {children}
        </div>
      </div>
    </section>
  )
}
