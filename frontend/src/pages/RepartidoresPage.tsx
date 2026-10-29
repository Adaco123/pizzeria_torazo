import { Link } from 'react-router'
import styles from '../features/catalogo/Catalogo.module.css'
import { RepartidoresAdmin } from '../features/repartidores/RepartidoresAdmin.tsx'

export function RepartidoresPage() {
  return (
    <section className={styles.page}>
      <Link to="/admin" className={styles.back}>
        ← Administración
      </Link>
      <h1>Repartidores</h1>
      <p className={styles.muted}>
        Personas o empresas de delivery. El cajero elige una al cobrar un domicilio. Si alguien ya hizo
        entregas no se borra: se desactiva y deja de aparecer en caja.
      </p>
      <RepartidoresAdmin />
    </section>
  )
}
