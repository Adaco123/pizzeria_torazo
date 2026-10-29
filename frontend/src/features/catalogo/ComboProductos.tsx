import { useEffect, useState } from 'react'
import { combosApi } from '../../api.ts'
import type { Combo, ComboProducto, Producto } from '../../api.ts'
import { useToast } from '../../toast/toast-context.ts'
import { esAbort, mensajeDeError } from '../../utils/formato.ts'
import { useAccion } from './useAccion.ts'
import styles from './Catalogo.module.css'

interface Props {
  combo: Combo
  productos: Producto[]
}

/** Productos que incluye un combo y cuántos de cada uno. */
export function ComboProductos({ combo, productos }: Props) {
  const toast = useToast()
  const [lista, setLista] = useState<ComboProducto[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [version, setVersion] = useState(0)
  const { ocupado, ejecutar } = useAccion(() => setVersion((v) => v + 1))

  const [productoId, setProductoId] = useState<number | null>(null)
  const [cantidad, setCantidad] = useState('1')
  const [editando, setEditando] = useState<{ productoId: number; texto: string } | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    combosApi
      .productos(combo.id, { signal: controller.signal })
      .then((datos) => {
        setLista(datos)
        setError(null)
      })
      .catch((e: unknown) => {
        if (!esAbort(e)) setError(mensajeDeError(e))
      })

    return () => controller.abort()
  }, [combo.id, version])

  if (error) return <p className={styles.error} role="alert">{error}</p>
  if (!lista) return <p className={styles.muted}>Cargando…</p>

  const nombreDe = (id: number) =>
    lista.find((l) => l.producto_id === id)?.producto?.nombre ?? productos.find((p) => p.id === id)?.nombre ?? `#${id}`
  const disponibles = productos
    .filter((p) => p.activo && !lista.some((l) => l.producto_id === p.id))
    .toSorted((a, b) => a.nombre.localeCompare(b.nombre))
  const elegido = productoId ?? disponibles[0]?.id ?? null

  const cantidadValida = (texto: string) => {
    const n = Number.parseInt(texto, 10)
    return Number.isInteger(n) && n >= 1 && String(n) === texto.trim() ? n : null
  }

  async function agregar() {
    const unidades = cantidadValida(cantidad)
    if (elegido === null) return toast.error('No quedan productos por agregar')
    if (unidades === null) return toast.error('La cantidad debe ser un entero de 1 o más')
    const resultado = await ejecutar(
      () => combosApi.agregarProducto(combo.id, { producto_id: elegido, cantidad: unidades }),
      'Producto agregado al combo',
    )
    if (resultado) {
      setCantidad('1')
      setProductoId(null)
    }
  }

  async function cambiarCantidad(item: ComboProducto, texto: string) {
    const unidades = cantidadValida(texto)
    if (unidades === null) return toast.error('La cantidad debe ser un entero de 1 o más')
    if (unidades === item.cantidad) {
      setEditando(null)
      return
    }
    const resultado = await ejecutar(
      () => combosApi.actualizarProducto(combo.id, item.producto_id, unidades),
      'Cantidad actualizada',
    )
    if (resultado) setEditando(null)
  }

  return (
    <div className={styles.panel}>
      <h3>Productos del combo «{combo.nombre}»</h3>

      {lista.length === 0 ? (
        <p className={styles.muted}>Todavía no tiene productos.</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Producto</th>
              <th className={styles.num}>Cantidad</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {lista.map((item) => {
              const enEdicion = editando?.productoId === item.producto_id
              return (
                <tr key={item.producto_id}>
                  <td>{nombreDe(item.producto_id)}</td>
                  <td className={styles.num}>
                    {enEdicion ? (
                      <input
                        className={styles.inlineInput}
                        type="number"
                        min="1"
                        step="1"
                        autoFocus
                        value={editando.texto}
                        onChange={(e) => setEditando({ productoId: item.producto_id, texto: e.target.value })}
                      />
                    ) : (
                      item.cantidad
                    )}
                  </td>
                  <td className={styles.acciones}>
                    {enEdicion ? (
                      <>
                        <button className={styles.link} type="button" disabled={ocupado} onClick={() => cambiarCantidad(item, editando.texto)}>
                          guardar
                        </button>
                        <button className={styles.link} type="button" onClick={() => setEditando(null)}>
                          cancelar
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          className={styles.link}
                          type="button"
                          onClick={() => setEditando({ productoId: item.producto_id, texto: String(item.cantidad) })}
                        >
                          cambiar cantidad
                        </button>
                        <button
                          className={styles.linkDanger}
                          type="button"
                          disabled={ocupado}
                          onClick={() =>
                            ejecutar(() => combosApi.quitarProducto(combo.id, item.producto_id), 'Producto quitado del combo')
                          }
                        >
                          quitar
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}

      {disponibles.length > 0 ? (
        <div className={styles.form}>
          <label className={`${styles.field} ${styles.grow}`}>
            <span>Agregar producto</span>
            <select value={elegido ?? ''} onChange={(e) => setProductoId(Number(e.target.value))}>
              {disponibles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            <span>Cantidad</span>
            <input type="number" min="1" step="1" value={cantidad} onChange={(e) => setCantidad(e.target.value)} />
          </label>
          <button className={styles.primary} type="button" disabled={ocupado} onClick={agregar}>
            Agregar
          </button>
        </div>
      ) : (
        <p className={styles.muted}>No quedan productos activos por agregar.</p>
      )}
    </div>
  )
}