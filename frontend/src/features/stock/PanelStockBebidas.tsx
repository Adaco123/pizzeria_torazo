import { useCallback, useEffect, useState, type SubmitEvent } from 'react'
import { stockApi } from '../../api.ts'
import type { MovimientoStock, StockBebidaResumen } from '../../api.ts'
import { useToast } from '../../toast/toast-context.ts'
import { esAbort, formatearFecha, mensajeDeError } from '../../utils/formato.ts'
import styles from '../catalogo/Catalogo.module.css'

const ETIQUETA_TIPO: Record<MovimientoStock['tipo'], string> = {
  entrada: 'Llegó',
  venta: 'Venta',
  devolucion: 'Devolución',
  ajuste: 'Ajuste',
}

interface Props {
  /** El administrador también puede corregir el stock hacia abajo o arriba, con motivo. */
  esAdmin: boolean
}

/** Stock de las bebidas: entradas cuando llega mercadería y (admin) correcciones. */
export function PanelStockBebidas({ esAdmin }: Props) {
  const toast = useToast()
  const [bebidas, setBebidas] = useState<StockBebidaResumen[] | null>(null)
  const [movimientos, setMovimientos] = useState<MovimientoStock[]>([])
  const [error, setError] = useState<string | null>(null)
  const [version, setVersion] = useState(0)
  const [entradas, setEntradas] = useState<Record<number, string>>({})
  const [ocupadoId, setOcupadoId] = useState<number | null>(null)
  const [ajustando, setAjustando] = useState<StockBebidaResumen | null>(null)
  const [cantidadAjuste, setCantidadAjuste] = useState('')
  const [motivo, setMotivo] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    const opts = { signal: controller.signal }
    Promise.all([stockApi.bebidas(opts), stockApi.movimientos({ limit: 30 }, opts)])
      .then(([lista, historial]) => {
        setBebidas(lista)
        setMovimientos(historial)
        setError(null)
      })
      .catch((e: unknown) => {
        if (!esAbort(e)) setError(mensajeDeError(e))
      })
    return () => controller.abort()
  }, [version])

  const recargar = useCallback(() => setVersion((v) => v + 1), [])

  async function agregar(bebida: StockBebidaResumen) {
    const texto = entradas[bebida.producto_id] ?? ''
    const cantidad = Number(texto)
    if (!Number.isInteger(cantidad) || cantidad < 1) {
      toast.error('Escribe cuántas unidades llegaron (un número entero, 1 o más)')
      return
    }
    setOcupadoId(bebida.producto_id)
    try {
      const mov = await stockApi.registrarMovimiento({ producto_id: bebida.producto_id, cantidad })
      toast.exito(`${bebida.nombre}: +${cantidad}. Ahora hay ${mov.stock_nuevo}`)
      setEntradas((e) => ({ ...e, [bebida.producto_id]: '' }))
      recargar()
    } catch (e) {
      toast.error(e)
    } finally {
      setOcupadoId(null)
    }
  }

  async function guardarAjuste(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!ajustando) return
    const cantidad = Number(cantidadAjuste)
    if (!Number.isInteger(cantidad) || cantidad === 0) {
      toast.error('La cantidad debe ser un número entero distinto de 0 (negativo para restar)')
      return
    }
    setOcupadoId(ajustando.producto_id)
    try {
      const mov = await stockApi.ajustar({ producto_id: ajustando.producto_id, cantidad, motivo: motivo.trim() })
      toast.exito(`${ajustando.nombre}: ahora hay ${mov.stock_nuevo}`)
      setAjustando(null)
      setCantidadAjuste('')
      setMotivo('')
      recargar()
    } catch (e) {
      toast.error(e)
    } finally {
      setOcupadoId(null)
    }
  }

  return (
    <section className={styles.card}>
      <h2>Stock de bebidas</h2>
      <p className={styles.muted}>
        Cuando llega mercadería, escribe cuántas unidades entraron. Cada bebida que se cobra se descuenta sola; todo
        queda en los movimientos, con quién lo hizo.
      </p>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      {!bebidas && !error && <p className={styles.muted}>Cargando stock…</p>}
      {bebidas && bebidas.length === 0 && (
        <p className={styles.muted}>No hay bebidas. Crea productos en la categoría «Bebidas».</p>
      )}

      {bebidas && bebidas.length > 0 && (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Bebida</th>
                <th className={styles.num}>Llegaron hoy</th>
                <th className={styles.num}>Vendidas hoy</th>
                <th className={styles.num}>Hay</th>
                <th>Llegaron</th>
                {esAdmin && <th>Corregir</th>}
              </tr>
            </thead>
            <tbody>
              {bebidas.map((b) => (
                <tr key={b.producto_id}>
                  <td>
                    {b.nombre}{' '}
                    {b.agotado && <span className={`${styles.badge} ${styles.badgeOff}`}>Agotada</span>}
                  </td>
                  <td className={styles.num}>{b.entradas_hoy > 0 ? `+${b.entradas_hoy}` : 0}</td>
                  <td className={styles.num}>{b.vendidas_hoy > 0 ? `−${b.vendidas_hoy}` : 0}</td>
                  <td className={styles.num}>{b.stock ?? 0}</td>
                  <td>
                    <div className={styles.acciones}>
                      <input
                        className={styles.inlineInput}
                        type="number"
                        inputMode="numeric"
                        min="1"
                        step="1"
                        placeholder="0"
                        aria-label={`Unidades que llegaron de ${b.nombre}`}
                        value={entradas[b.producto_id] ?? ''}
                        onChange={(e) => setEntradas((x) => ({ ...x, [b.producto_id]: e.target.value }))}
                      />
                      <button
                        className={styles.primary}
                        type="button"
                        disabled={ocupadoId === b.producto_id}
                        onClick={() => void agregar(b)}
                      >
                        Agregar
                      </button>
                    </div>
                  </td>
                  {esAdmin && (
                    <td>
                      <button className={styles.link} type="button" onClick={() => setAjustando(b)}>
                        Ajustar
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {esAdmin && ajustando && (
        <form className={styles.panel} onSubmit={guardarAjuste}>
          <h3>Ajustar el stock de {ajustando.nombre}</h3>
          <p className={styles.muted}>Hay {ajustando.stock ?? 0}. Usa un número negativo para restar (por ejemplo −2).</p>
          <label className={styles.field}>
            <span>Cantidad (con signo)</span>
            <input
              type="number"
              inputMode="numeric"
              step="1"
              value={cantidadAjuste}
              onChange={(e) => setCantidadAjuste(e.target.value)}
              required
              autoFocus
            />
          </label>
          <label className={styles.field}>
            <span>Motivo</span>
            <input
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Botella rota, error al contar…"
              minLength={3}
              maxLength={200}
              required
            />
          </label>
          <div className={styles.acciones}>
            <button className={styles.primary} type="submit" disabled={ocupadoId === ajustando.producto_id}>
              Guardar ajuste
            </button>
            <button className={styles.secondary} type="button" onClick={() => setAjustando(null)}>
              Cancelar
            </button>
          </div>
        </form>
      )}

      {movimientos.length > 0 && (
        <div>
          <h3>Últimos movimientos</h3>
          <p className={styles.muted}>Lo que llegó, lo que se vendió y las correcciones.</p>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Bebida</th>
                  <th>Qué pasó</th>
                  <th className={styles.num}>Cambio</th>
                  <th className={styles.num}>Quedó</th>
                  <th>Quién</th>
                  <th>Motivo</th>
                </tr>
              </thead>
              <tbody>
                {movimientos.map((m) => (
                  <tr key={m.id}>
                    <td>{formatearFecha(m.fecha)}</td>
                    <td>{m.producto_nombre}</td>
                    <td>{ETIQUETA_TIPO[m.tipo]}</td>
                    <td className={styles.num}>{m.cantidad > 0 ? `+${m.cantidad}` : m.cantidad}</td>
                    <td className={styles.num}>{m.stock_nuevo}</td>
                    <td>{m.usuario_nombre}</td>
                    <td>{m.motivo ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  )
}
