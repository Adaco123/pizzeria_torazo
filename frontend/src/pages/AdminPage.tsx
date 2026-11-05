import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router'
import { MarcoAdmin } from '../features/admin/MarcoAdmin.tsx'
import { SECCIONES_ADMIN } from '../features/admin/secciones.ts'
import styles from '../features/admin/Admin.module.css'

export function AdminPage() {
  return (
    <MarcoAdmin>
      <div className={styles.tarjetas}>
        {SECCIONES_ADMIN.map(({ path, label, resumen, icono: Icono }) => (
          <Link key={path} className={styles.tarjeta} to={path}>
            <span className={styles.icono}>
              <Icono size={22} aria-hidden="true" />
            </span>
            <h2>{label}</h2>
            <p>{resumen}</p>
            <span className={styles.abrir}>
              Abrir <ChevronRight size={15} aria-hidden="true" />
            </span>
          </Link>
        ))}
      </div>
    </MarcoAdmin>
  )
}
