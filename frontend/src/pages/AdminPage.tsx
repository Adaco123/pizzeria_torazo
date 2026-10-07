import { Link } from 'react-router'
import styles from '../features/catalogo/Catalogo.module.css'

export function AdminPage() {
  return (
    <section className={styles.page}>
      <h1>Administración</h1>

      <section className={styles.card}>
        <h2>Catálogo</h2>
        <p className={styles.muted}>
          Productos con sus tamaños y precios, categorías, ingredientes y combos.
        </p>
        <div>
          <Link to="/admin/catalogo">Abrir catálogo →</Link>
        </div>
      </section>

      <p className={styles.muted}>Próximamente: usuarios, estadísticas y stock de bebidas.</p>
    </section>
  )
}