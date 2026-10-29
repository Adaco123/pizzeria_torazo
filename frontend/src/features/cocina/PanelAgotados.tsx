import { useEffect, useState } from 'react'
import { productosApi } from '../../api.ts'
import type { Producto } from '../../api.ts'
import { useToast } from '../../toast/toast-context.ts'
import { esAbort, mensajeDeError } from '../../utils/formato.ts'
import styles from './Cocina.module.css'

/**
 * Lista de productos activos para marcar cuáles se agotaron. Un producto agotado deja de
 * poder venderse en caja hasta que se desmarque. Cocina, caja y administrador pueden usarlo.
 */
export function PanelAgotados() {
  const toast = useToast()
  const [productos, setProductos] = useState<Producto[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [ocupadoId, setOcupadoId] = useState<number | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    productosApi
      .listar({ signal: controller.signal })
      .then((lista) => setProductos(lista.filter((p) => p.activo)))
      .catch((e: unknown) => {
        if (!esAbort(e)) setError(mensajeDeError(e))
      })
    return () => controller.abort()
  }, [])

  async function alternar(producto: Producto) {
    setOcupadoId(producto.id)
    try {
      const nuevo = await productosApi.marcarAgotado(producto.id, !producto.agotado)
      setProductos((lista) => lista?.map((p) => (p.id === nuevo.id ? { ...p, agotado: nuevo.agotado } : p)) ?? null)
      toast.exito(nuevo.agotado ? `${producto.nombre}: agotado` : `${producto.nombre}: disponible otra vez`)
    } catch (e) {
      toast.error(e)
    } finally {
      setOcupadoId(null)
    }
  }

  const agotados = productos?.filter((p) => p.agotado).length ?? 0

  return (
    <details className={styles.agotados}>
      <summary>
        Productos agotados
        {agotados > 0 && <span className={styles.contadorAgotados}>{agotados}</span>}
      </summary>

      {error && (
        <p className={styles.aviso} role="alert">
          {error}
        </p>
      )}
      {!productos && !error && <p className={styles.columnaVacia}>Cargando productos…</p>}
      {productos && (
        <>
          <p className={styles.ayuda}>Toca un producto para marcarlo como agotado. Vuelve a tocarlo para habilitarlo.</p>
          <div className={styles.chipsAgotados}>
            {productos.map((p) => (
              <button
                key={p.id}
                type="button"
                className={p.agotado ? `${styles.chipAgotado} ${styles.chipAgotadoSi}` : styles.chipAgotado}
                aria-pressed={p.agotado}
                disabled={ocupadoId === p.id}
                onClick={() => void alternar(p)}
              >
                {p.nombre}
                {p.agotado && <small>Agotado</small>}
              </button>
            ))}
          </div>
        </>
      )}
    </details>
  )
}
