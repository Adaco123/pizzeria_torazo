import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router'
import { useAccesosDelRol } from '../../routes/useAccesosDelRol.ts'
import styles from './Cuenta.module.css'

const RUTA_CUENTA = '/cuenta'

/** Riel con atajos a las pantallas que el rol puede abrir (las del menú de arriba, menos esta). */
export function MisPantallas() {
  const accesos = useAccesosDelRol().filter((acceso) => acceso.path !== RUTA_CUENTA)
  if (accesos.length === 0) return null

  return (
    <aside className={styles.riel} aria-label="Mis pantallas">
      <div className={styles.rielCabeza}>
        <h2>Mis pantallas</h2>
      </div>
      <ul className={styles.lista}>
        {accesos.map((acceso) => (
          <li key={acceso.path}>
            <Link className={styles.acceso} to={acceso.path}>
              <span className={styles.datos}>
                <b>{acceso.label}</b>
                <small>{acceso.descripcion}</small>
              </span>
              <ChevronRight size={16} aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
    </aside>
  )
}
