import { Fragment, useState } from 'react'
import { productosApi } from '../../api.ts'
import type { Producto } from '../../api.ts'
import { formatearMonto } from '../../utils/formato.ts'
import type { DatosCatalogo } from './useCatalogoAdmin.ts'
import { mensajeEliminar } from './errores.ts'
import { ProductoDetalle } from './ProductoDetalle.tsx'
import { ProductoForm } from './ProductoForm.tsx'
import { useAccion } from './useAccion.ts'
import styles from './Catalogo.module.css'

interface Props {
  datos: DatosCatalogo
  recargar: () => void
}

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

export function ProductosTab({ datos, recargar }: Props) {
  const { ocupado, ejecutar } = useAccion(recargar)
  const [busqueda, setBusqueda] = useState('')
  const [categoriaId, setCategoriaId] = useState<number | 'todas'>('todas')
  const [formulario, setFormulario] = useState<'nuevo' | number | null>(null)
  const [abiertoId, setAbiertoId] = useState<number | null>(null)

  const nombreCategoria = (id: number) => datos.categorias.find((c) => c.id === id)?.nombre ?? '—'
  const texto = normalizar(busqueda.trim())

  const visibles = datos.productos
    .filter((p) => categoriaId === 'todas' || p.categoria_id === categoriaId)
    .filter((p) => normalizar(p.nombre).includes(texto))
    .toSorted((a, b) => nombreCategoria(a.categoria_id).localeCompare(nombreCategoria(b.categoria_id)) || a.nombre.localeCompare(b.nombre))

  const enEdicion = typeof formulario === 'number' ? datos.productos.find((p) => p.id === formulario) : undefined

  async function eliminar(producto: Producto) {
    if (!window.confirm(`¿Eliminar el producto «${producto.nombre}»?`)) return
    await ejecutar(
      () => productosApi.eliminar(producto.id),
      'Producto eliminado',
      (e) => mensajeEliminar(e, producto.nombre),
    )
  }

  return (
    <>
      {formulario !== null && datos.categorias.length === 0 && (
        <p className={styles.hint}>Primero crea una categoría en la pestaña Categorías.</p>
      )}

      {formulario === 'nuevo' && datos.categorias.length > 0 && (
        <ProductoForm
          categorias={datos.categorias}
          onGuardado={() => {
            setFormulario(null)
            recargar()
          }}
          onCancelar={() => setFormulario(null)}
        />
      )}
      {enEdicion && (
        <ProductoForm
          key={enEdicion.id}
          categorias={datos.categorias}
          inicial={enEdicion}
          onGuardado={() => {
            setFormulario(null)
            recargar()
          }}
          onCancelar={() => setFormulario(null)}
        />
      )}

      <section className={styles.card}>
        <div className={styles.headerRow}>
          <h2>Productos</h2>
          <button className={styles.primary} type="button" onClick={() => setFormulario('nuevo')}>
            + Nuevo producto
          </button>
        </div>

        <div className={styles.filters}>
          <input
            type="search"
            placeholder="Buscar producto"
            aria-label="Buscar producto"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
          <select
            aria-label="Filtrar por categoría"
            value={categoriaId}
            onChange={(e) => setCategoriaId(e.target.value === 'todas' ? 'todas' : Number(e.target.value))}
          >
            <option value="todas">Todas las categorías</option>
            {datos.categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Producto</th>
                <th>Categoría</th>
                <th className={styles.num}>Precio base</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((producto) => (
                <Fragment key={producto.id}>
                  <tr className={producto.activo ? undefined : styles.inactiva}>
                    <td>{producto.nombre}</td>
                    <td>{nombreCategoria(producto.categoria_id)}</td>
                    <td className={styles.num}>{formatearMonto(producto.precio_base)}</td>
                    <td>
                      <span className={producto.activo ? `${styles.badge} ${styles.badgeOn}` : `${styles.badge} ${styles.badgeOff}`}>
                        {producto.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className={styles.acciones}>
                      <button
                        className={styles.link}
                        type="button"
                        aria-expanded={abiertoId === producto.id}
                        onClick={() => setAbiertoId(abiertoId === producto.id ? null : producto.id)}
                      >
                        {abiertoId === producto.id ? 'ocultar tamaños' : 'tamaños e ingredientes'}
                      </button>
                      <button className={styles.link} type="button" onClick={() => setFormulario(producto.id)}>
                        editar
                      </button>
                      <button
                        className={styles.link}
                        type="button"
                        disabled={ocupado}
                        onClick={() =>
                          ejecutar(
                            () => productosApi.toggleActivo(producto.id),
                            producto.activo ? 'Producto desactivado' : 'Producto activado',
                          )
                        }
                      >
                        {producto.activo ? 'desactivar' : 'activar'}
                      </button>
                      <button className={styles.linkDanger} type="button" disabled={ocupado} onClick={() => eliminar(producto)}>
                        eliminar
                      </button>
                    </td>
                  </tr>
                  {abiertoId === producto.id && (
                    <tr>
                      <td colSpan={5} style={{ padding: 0 }}>
                        <ProductoDetalle producto={producto} tamanos={datos.tamanos} ingredientes={datos.ingredientes} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
              {visibles.length === 0 && (
                <tr>
                  <td colSpan={5} className={styles.muted}>
                    No hay productos que coincidan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}