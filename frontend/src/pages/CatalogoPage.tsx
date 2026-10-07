import { Link, useSearchParams } from 'react-router'
import { CategoriasTab } from '../features/catalogo/CategoriasTab.tsx'
import { CombosTab } from '../features/catalogo/CombosTab.tsx'
import { IngredientesTab } from '../features/catalogo/IngredientesTab.tsx'
import { ProductosTab } from '../features/catalogo/ProductosTab.tsx'
import { TamanosTab } from '../features/catalogo/TamanosTab.tsx'
import { useCatalogoAdmin } from '../features/catalogo/useCatalogoAdmin.ts'
import styles from '../features/catalogo/Catalogo.module.css'

const PESTANAS = [
  { id: 'productos', label: 'Productos' },
  { id: 'categorias', label: 'Categorías' },
  { id: 'tamanos', label: 'Tamaños' },
  { id: 'ingredientes', label: 'Ingredientes' },
  { id: 'combos', label: 'Combos' },
] as const

type PestanaId = (typeof PESTANAS)[number]['id']

function pestanaDe(valor: string | null): PestanaId {
  return PESTANAS.find((p) => p.id === valor)?.id ?? 'productos'
}

export function CatalogoPage() {
  const [params, setParams] = useSearchParams()
  const pestana = pestanaDe(params.get('tab'))
  const { datos, error, recargar } = useCatalogoAdmin()

  return (
    <section className={styles.page}>
      <Link to="/admin" className={styles.back}>
        ← Administración
      </Link>
      <h1>Catálogo</h1>

      <div className={styles.tabs} role="tablist">
        {PESTANAS.map((p) => (
          <button
            key={p.id}
            type="button"
            role="tab"
            aria-selected={p.id === pestana}
            className={p.id === pestana ? styles.tabActive : styles.tab}
            onClick={() => setParams({ tab: p.id }, { replace: true })}
          >
            {p.label}
          </button>
        ))}
      </div>

      {error && (
        <div className={styles.errorRow}>
          <p className={styles.error} role="alert">
            {error}
          </p>
          <button className={styles.secondary} type="button" onClick={recargar}>
            Reintentar
          </button>
        </div>
      )}
      {!datos && !error && <p className={styles.muted}>Cargando catálogo…</p>}

      {datos && pestana === 'productos' && <ProductosTab datos={datos} recargar={recargar} />}
      {datos && pestana === 'categorias' && (
        <CategoriasTab categorias={datos.categorias} productos={datos.productos} recargar={recargar} />
      )}
      {datos && pestana === 'tamanos' && <TamanosTab tamanos={datos.tamanos} recargar={recargar} />}
      {datos && pestana === 'ingredientes' && <IngredientesTab datos={datos} recargar={recargar} />}
      {datos && pestana === 'combos' && <CombosTab datos={datos} recargar={recargar} />}
    </section>
  )
}