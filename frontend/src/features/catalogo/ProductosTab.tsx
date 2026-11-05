import { Layers, Package, PackageOpen, Pencil, Plus, Power, Trash2 } from 'lucide-react'
import { Fragment, useState } from 'react'
import { productosApi } from '../../apis/productos.ts'
import type { Producto } from '../../apis/productos.ts'
import { formatearMonto } from '../../utils/formato.ts'
import type { DatosCatalogo } from './useCatalogoAdmin.ts'
import { mensajeEliminar } from './errores.ts'
import { esCategoriaBebidas } from '../pedidos/categorias.ts'
import { ProductoDetalle } from './ProductoDetalle.tsx'
import { ProductoForm } from './ProductoForm.tsx'
import { useAccion } from './useAccion.ts'
import { Acciones, Buscador, BotonIcono, Cabeza, EstadoPildora, FiltroEstadoBarra, Vacio } from '../admin/ui.tsx'
import { coincideEstado } from '../admin/filtros.ts'
import type { FiltroEstado } from '../admin/filtros.ts'
import ui from '../admin/Ui.module.css'
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
  const [filtro, setFiltro] = useState<FiltroEstado>('todos')

  const esBebida = (p: Producto) => {
    const categoria = datos.categorias.find((c) => c.id === p.categoria_id)
    return categoria !== undefined && esCategoriaBebidas(categoria)
  }
  const nombreCategoria = (id: number) => datos.categorias.find((c) => c.id === id)?.nombre ?? '—'
  const texto = normalizar(busqueda.trim())

  const visibles = datos.productos
    .filter((p) => categoriaId === 'todas' || p.categoria_id === categoriaId)
    .filter((p) => coincideEstado(filtro, p.activo))
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
        <Cabeza icono={Package} titulo="Productos" cuenta={datos.productos.length}>
          <button className={`${ui.btn} ${ui.primario}`} type="button" onClick={() => setFormulario('nuevo')}>
            <Plus size={16} aria-hidden="true" /> Nuevo producto
          </button>
        </Cabeza>

        <div className={ui.herramientas}>
          <Buscador valor={busqueda} onChange={setBusqueda} etiqueta="Buscar producto" />
          <select
            className={ui.selector}
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
          <FiltroEstadoBarra valor={filtro} onChange={setFiltro} items={datos.productos} />
        </div>

        {visibles.length === 0 ? (
          <Vacio icono={PackageOpen} titulo="No hay productos que coincidan" detalle="Prueba con otro nombre o quita el filtro." />
        ) : (
          <div className={ui.tw}>
            <table className={ui.tabla}>
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Categoría</th>
                  <th className={ui.num}>Precio base</th>
                  <th className={ui.num}>Stock</th>
                  <th>Estado</th>
                  <th>
                    <span className={ui.soloLector}>Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {visibles.map((producto) => (
                  <Fragment key={producto.id}>
                    <tr className={producto.activo ? undefined : ui.inactiva}>
                      <td>
                        <b>{producto.nombre}</b>
                      </td>
                      <td>{nombreCategoria(producto.categoria_id)}</td>
                      <td className={ui.num}>{formatearMonto(producto.precio_base)}</td>
                      <td className={ui.num}>{esBebida(producto) ? (producto.stock ?? 0) : '—'}</td>
                      <td>
                        <EstadoPildora activo={producto.activo} />
                      </td>
                      <td className={ui.acciones}>
                        <Acciones>
                          {/* Las bebidas no tienen tamaños ni ingredientes: su stock está en «Stock de bebidas». */}
                          {!esBebida(producto) && (
                            <BotonIcono
                              icono={Layers}
                              titulo={abiertoId === producto.id ? 'Ocultar tamaños e ingredientes' : 'Tamaños e ingredientes'}
                              tono={abiertoId === producto.id ? 'activo' : undefined}
                              expandido={abiertoId === producto.id}
                              onClick={() => setAbiertoId(abiertoId === producto.id ? null : producto.id)}
                            />
                          )}
                          <BotonIcono icono={Pencil} titulo={`Editar «${producto.nombre}»`} onClick={() => setFormulario(producto.id)} />
                          <BotonIcono
                            icono={Power}
                            titulo={producto.activo ? `Desactivar «${producto.nombre}»` : `Activar «${producto.nombre}»`}
                            tono={producto.activo ? 'ok' : 'off'}
                            disabled={ocupado}
                            onClick={() =>
                              void ejecutar(
                                () => productosApi.toggleActivo(producto.id),
                                producto.activo ? 'Producto desactivado' : 'Producto activado',
                              )
                            }
                          />
                          <BotonIcono icono={Trash2} titulo={`Eliminar «${producto.nombre}»`} tono="peligro" disabled={ocupado} onClick={() => void eliminar(producto)} />
                        </Acciones>
                      </td>
                    </tr>
                    {abiertoId === producto.id && (
                      <tr className={ui.detalle}>
                        <td colSpan={6}>
                          <ProductoDetalle producto={producto} tamanos={datos.tamanos} ingredientes={datos.ingredientes} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  )
}
