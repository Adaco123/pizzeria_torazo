import { useEffect, useState } from 'react'
import { productosApi } from '../../api.ts'
import type { Ingrediente, Producto, ProductoIngrediente, ProductoTamanoPrecio, Tamano } from '../../api.ts'
import { useToast } from '../../toast/toast-context.ts'
import { esAbort, formatearMonto, mensajeDeError, parseMonto } from '../../utils/formato.ts'
import { useAccion } from './useAccion.ts'
import styles from './Catalogo.module.css'

interface Props {
  producto: Producto
  tamanos: Tamano[]
  ingredientes: Ingrediente[]
}

/** Tamaños con precio e ingredientes base de un producto. */
export function ProductoDetalle({ producto, tamanos, ingredientes }: Props) {
  const toast = useToast()
  const [asignados, setAsignados] = useState<ProductoTamanoPrecio[] | null>(null)
  const [base, setBase] = useState<ProductoIngrediente[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [version, setVersion] = useState(0)
  const { ocupado, ejecutar } = useAccion(() => setVersion((v) => v + 1))

  const [nuevoTamanoId, setNuevoTamanoId] = useState<number | null>(null)
  const [nuevoPrecio, setNuevoPrecio] = useState('')
  const [editando, setEditando] = useState<{ tamanoId: number; texto: string } | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    const opts = { signal: controller.signal }

    Promise.all([productosApi.tamanos(producto.id, opts), productosApi.ingredientes(producto.id, opts)])
      .then(([listaTamanos, listaBase]) => {
        setAsignados(listaTamanos)
        setBase(listaBase)
        setError(null)
      })
      .catch((e: unknown) => {
        if (!esAbort(e)) setError(mensajeDeError(e))
      })

    return () => controller.abort()
  }, [producto.id, version])

  if (error) return <p className={styles.error} role="alert">{error}</p>
  if (!asignados || !base) return <p className={styles.muted}>Cargando…</p>

  const libres = tamanos.filter((t) => !asignados.some((a) => a.tamano_id === t.id))
  const tamanoElegido = nuevoTamanoId ?? libres[0]?.id ?? null
  const idsBase = new Set(base.map((b) => b.ingrediente_id))

  async function agregarTamano() {
    const precio = parseMonto(nuevoPrecio)
    if (tamanoElegido === null) return toast.error('No quedan tamaños por asignar')
    if (precio === null) return toast.error('Ingresa un precio válido (0 o mayor)')
    const resultado = await ejecutar(
      () => productosApi.asignarTamano(producto.id, { tamano_id: tamanoElegido, precio }),
      'Tamaño asignado',
    )
    if (resultado) {
      setNuevoPrecio('')
      setNuevoTamanoId(null)
    }
  }

  /**
   * El backend no tiene "editar precio de un tamaño": se quita y se vuelve a asignar.
   * Si la segunda parte falla se intenta devolver el precio anterior.
   */
  async function cambiarPrecio(actual: ProductoTamanoPrecio, texto: string) {
    const precio = parseMonto(texto)
    if (precio === null) return toast.error('Ingresa un precio válido (0 o mayor)')
    if (precio === actual.precio) {
      setEditando(null)
      return
    }
    const resultado = await ejecutar(async () => {
      await productosApi.quitarTamano(producto.id, actual.tamano_id)
      try {
        await productosApi.asignarTamano(producto.id, { tamano_id: actual.tamano_id, precio })
      } catch (e) {
        await productosApi
          .asignarTamano(producto.id, { tamano_id: actual.tamano_id, precio: actual.precio })
          .catch(() => undefined)
        throw e
      }
    }, 'Precio actualizado')
    if (resultado) setEditando(null)
    else setVersion((v) => v + 1)
  }

  async function quitarTamano(actual: ProductoTamanoPrecio) {
    if (!window.confirm(`¿Quitar el tamaño ${actual.tamano} de «${producto.nombre}»?`)) return
    await ejecutar(() => productosApi.quitarTamano(producto.id, actual.tamano_id), 'Tamaño quitado')
  }

  async function alternarIngrediente(ingrediente: Ingrediente) {
    const incluido = idsBase.has(ingrediente.id)
    await ejecutar(async () => {
      if (incluido) await productosApi.quitarIngrediente(producto.id, ingrediente.id)
      else await productosApi.asignarIngrediente(producto.id, ingrediente.id)
    }, incluido ? `${ingrediente.nombre} quitado` : `${ingrediente.nombre} agregado`)
  }

  return (
    <div className={styles.panel}>
      <div>
        <h3>Tamaños y precios</h3>
        {asignados.length === 0 && (
          <p className={styles.muted}>Sin tamaños: se cobra el precio base ({formatearMonto(producto.precio_base)}).</p>
        )}
        {asignados.length > 0 && (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Tamaño</th>
                <th className={styles.num}>Precio</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {asignados.map((asignado) => {
                const enEdicion = editando?.tamanoId === asignado.tamano_id
                return (
                  <tr key={asignado.tamano_id}>
                    <td>{asignado.tamano}</td>
                    <td className={styles.num}>
                      {enEdicion ? (
                        <input
                          className={styles.inlineInput}
                          type="number"
                          inputMode="decimal"
                          min="0"
                          step="0.01"
                          autoFocus
                          value={editando.texto}
                          onChange={(e) => setEditando({ tamanoId: asignado.tamano_id, texto: e.target.value })}
                        />
                      ) : (
                        formatearMonto(asignado.precio)
                      )}
                    </td>
                    <td className={styles.acciones}>
                      {enEdicion ? (
                        <>
                          <button className={styles.link} type="button" disabled={ocupado} onClick={() => cambiarPrecio(asignado, editando.texto)}>
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
                            onClick={() => setEditando({ tamanoId: asignado.tamano_id, texto: String(asignado.precio) })}
                          >
                            cambiar precio
                          </button>
                          <button className={styles.linkDanger} type="button" disabled={ocupado} onClick={() => quitarTamano(asignado)}>
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

        {libres.length > 0 ? (
          <div className={styles.form} style={{ marginTop: 12 }}>
            <label className={styles.field}>
              <span>Agregar tamaño</span>
              <select value={tamanoElegido ?? ''} onChange={(e) => setNuevoTamanoId(Number(e.target.value))}>
                {libres.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nombre}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.field}>
              <span>Precio (Bs)</span>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={nuevoPrecio}
                onChange={(e) => setNuevoPrecio(e.target.value)}
              />
            </label>
            <button className={styles.primary} type="button" disabled={ocupado} onClick={agregarTamano}>
              Agregar
            </button>
          </div>
        ) : (
          tamanos.length > 0 && <p className={styles.muted}>Ya tiene todos los tamaños asignados.</p>
        )}
      </div>

      <div>
        <h3>Ingredientes base</h3>
        <p className={styles.muted}>Lo que ya trae el producto. Toca un ingrediente para agregarlo o quitarlo.</p>
        {ingredientes.length === 0 ? (
          <p className={styles.muted}>Todavía no hay ingredientes. Créalos en la pestaña Ingredientes.</p>
        ) : (
          <div className={styles.chips}>
            {ingredientes.map((ingrediente) => (
              <button
                key={ingrediente.id}
                type="button"
                className={idsBase.has(ingrediente.id) ? styles.chipActive : styles.chip}
                aria-pressed={idsBase.has(ingrediente.id)}
                disabled={ocupado}
                onClick={() => alternarIngrediente(ingrediente)}
              >
                {ingrediente.nombre}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}