import { Link } from 'react-router'
import styles from '../features/catalogo/Catalogo.module.css'
import { MesasAdmin } from '../features/mesas/MesasAdmin.tsx'

export function MesasAdminPage() {
  return (
    <section className={styles.page}>
      <Link to="/admin" className={styles.back}>
        ← Administración
      </Link>
      <h1>Mesas</h1>
      <p className={styles.muted}>
        Las mesas del local. Una mesa que ya tuvo cuentas no se borra: se desactiva y deja de aparecer en el
        plano.
      </p>
      <MesasAdmin />
    </section>
  )
}
