import { GlassWater, Minus, Plus } from 'lucide-react'
import { useCallback, useEffect, useState, type SubmitEvent } from 'react'
import { stockApi } from '../../../apis/stock.ts'
import type { MovimientoStock, StockBebidaResumen } from '../../../apis/stock.ts'
import { useToast } from '../../../toast/toast-context.ts'
import { esAbort, mensajeDeError } from '../../../utils/formato.ts'
import { horaCorta } from './hora.ts'
import styles from './Herramientas.module.css'

const ETIQUETA_TIPO: Record<MovimientoStock['tipo'], string> = { entrada: 'Llegó', venta: 'Venta', devolucion: 'Devolución', ajuste: 'Ajuste' }
const RAPIDAS = [6, 12, 24]

/** Stock de bebidas: entradas cuando llega mercadería y (administrador) correcciones con motivo. */
export function HojaStock({ esAdmin }: { esAdmin: boolean }) {
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
  const poner = (id: number, valor: string) => setEntradas((e) => ({ ...e, [id]: valor }))
  const sumar = (id: number, n: number) => poner(id, String(Math.max(0, Number(entradas[id] || 0) + n)))

  async function agregar(bebida: StockBebidaResumen) {
    const cantidad = Number(entradas[bebida.producto_id] ?? '')
    if (!Number.isInteger(cantidad) || cantidad < 1) return toast.error('Escribe cuántas unidades llegaron (un número entero, 1 o más)')
    setOcupadoId(bebida.producto_id)
    try {
      const mov = await stockApi.registrarMovimiento({ producto_id: bebida.producto_id, cantidad })
      toast.exito(`${bebida.nombre}: +${cantidad}. Ahora hay ${mov.stock_nuevo}`)
      poner(bebida.producto_id, '')
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
    if (!Number.isInteger(cantidad) || cantidad === 0) return toast.error('La cantidad debe ser un número entero distinto de 0 (negativo para restar)')
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
    <div className={styles.cuerpo}>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      <p className={styles.ayuda}>Cuando llega mercadería, anota cuántas unidades entraron. Cada bebida que se cobra se descuenta sola.</p>

      {!bebidas && !error && <p className={styles.vacio}>Cargando stock…</p>}
      {bebidas && bebidas.length === 0 && (
        <p className={styles.vacio}>
          <GlassWater size={28} aria-hidden="true" />
          No hay bebidas. Crea productos en la categoría «Bebidas».
        </p>
      )}

      <ul className={styles.lista}>
        {bebidas?.map((b) => {
          const hay = b.stock ?? 0
          const nivel = hay === 0 ? 'cero' : hay <= 3 ? 'bajo' : 'ok'
          const valor = entradas[b.producto_id] ?? ''
          return (
            <li key={b.producto_id} className={styles.bebida}>
              <div className={styles.bebidaTop}>
                <span className={styles.itemTexto}>
                  <b>{b.nombre}</b>
                  <small>
                    Hoy: {b.entradas_hoy > 0 ? `+${b.entradas_hoy}` : 0} llegaron · {b.vendidas_hoy > 0 ? `−${b.vendidas_hoy}` : 0} vendidas
                  </small>
                </span>
                <span className={`${styles.stock} ${styles[nivel]}`} aria-label={`Hay ${hay}`}>
                  {hay}
                </span>
              </div>
              <div className={styles.entrada}>
                <div className={styles.stepper}>
                  <button type="button" aria-label={`Restar una unidad a lo que llegó de ${b.nombre}`} onClick={() => sumar(b.producto_id, -1)}>
                    <Minus size={16} aria-hidden="true" />
                  </button>
                  <input
                    type="number"
                    inputMode="numeric"
                    min="1"
                    step="1"
                    placeholder="0"
                    aria-label={`Unidades que llegaron de ${b.nombre}`}
                    value={valor}
                    onChange={(e) => poner(b.producto_id, e.target.value)}
                  />
                  <button type="button" aria-label={`Sumar una unidad a lo que llegó de ${b.nombre}`} onClick={() => sumar(b.producto_id, 1)}>
                    <Plus size={16} aria-hidden="true" />
                  </button>
                </div>
                {RAPIDAS.map((n) => (
                  <button key={n} type="button" className={styles.chipChico} onClick={() => sumar(b.producto_id, n)}>
                    +{n}
                  </button>
                ))}
                <button type="button" className={styles.principalChico} disabled={ocupadoId === b.producto_id} onClick={() => void agregar(b)}>
                  Agregar
                </button>
                {esAdmin && (
                  <button type="button" className={styles.enlace} onClick={() => setAjustando(b)}>
                    Ajustar
                  </button>
                )}
              </div>
            </li>
          )
        })}
      </ul>

      {esAdmin && ajustando && (
        <form className={styles.formulario} onSubmit={guardarAjuste} aria-label="Ajustar stock">
          <h3 className={styles.titulo}>Ajustar el stock de {ajustando.nombre}</h3>
          <p className={styles.ayuda}>Hay {ajustando.stock ?? 0}. Usa un número negativo para restar (por ejemplo −2).</p>
          <input className={styles.texto} type="number" inputMode="numeric" step="1" placeholder="Cantidad (con signo)" value={cantidadAjuste} onChange={(e) => setCantidadAjuste(e.target.value)} required autoFocus />
          <input className={styles.texto} value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Motivo: botella rota, error al contar…" minLength={3} maxLength={200} required />
          <div className={styles.fila}>
            <button className={styles.principalChico} type="submit" disabled={ocupadoId === ajustando.producto_id}>
              Guardar ajuste
            </button>
            <button className={styles.secundario} type="button" onClick={() => setAjustando(null)}>
              Cancelar
            </button>
          </div>
        </form>
      )}

      {movimientos.length > 0 && (
        <details className={styles.plegable}>
          <summary>Últimos movimientos ({movimientos.length})</summary>
          <ul className={styles.lista}>
            {movimientos.map((m) => (
              <li key={m.id} className={styles.item}>
                <span className={styles.hora}>{horaCorta(m.fecha)}</span>
                <span className={styles.itemTexto}>
                  <b>{m.producto_nombre}</b>
                  <small>
                    {ETIQUETA_TIPO[m.tipo]} · {m.usuario_nombre}
                    {m.motivo ? ` · ${m.motivo}` : ''}
                  </small>
                </span>
                <b className={styles.importe}>
                  {m.cantidad > 0 ? `+${m.cantidad}` : m.cantidad} <small>→ {m.stock_nuevo}</small>
                </b>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}
