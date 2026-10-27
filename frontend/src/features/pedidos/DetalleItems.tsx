import type { Combo, DetallePedido } from '../../api.ts'
import { formatearMonto } from '../../utils/formato.ts'
import styles from './Pedidos.module.css'

interface Props {
  detalles: DetallePedido[]
  total: number
  /** Costo de envío (solo domicilio): se muestra antes del total. */
  /** Bs descontados de los productos (se muestra antes del envío y del total). */
  descuento?: number
  envio?: { costo: number; repartidor?: string | null }
  combos: Combo[]
  /** Si es true se pueden quitar extras. */
  editable: boolean
  onQuitarExtra: (detalleId: number, extraId: number) => void
  /** Si se pasa, cada producto muestra un botón para quitarlo (la caja, mientras es borrador). */
  onQuitarDetalle?: (detalleId: number) => void
}

function tituloDe(detalle: DetallePedido, combos: Combo[]): string {
  if (detalle.is_mitad) return 'Pizza mitad y mitad'
  if (detalle.combo_id !== null) {
    return combos.find((c) => c.id === detalle.combo_id)?.nombre ?? `Combo #${detalle.combo_id}`
  }
  return detalle.producto_nombre ?? 'Producto'
}

export function DetalleItems({
  detalles,
  total,
  descuento,
  envio,
  combos,
  editable,
  onQuitarExtra,
  onQuitarDetalle,
}: Props) {
  if (detalles.length === 0) {
    return <p className={styles.muted}>Todavía no agregaste nada a este pedido.</p>
  }

  return (
    <div className={styles.items}>
      <ul className={styles.itemList}>
        {detalles.map((detalle) => (
          <li key={detalle.id} className={styles.item}>
            <div className={styles.itemMain}>
              <strong>
                {detalle.cantidad} × {tituloDe(detalle, combos)}
                {detalle.tamano_nombre ? ` (${detalle.tamano_nombre})` : ''}
              </strong>

              {detalle.mitades.length > 0 && (
                <ul className={styles.subList}>
                  {[...detalle.mitades]
                    .sort((a, b) => a.mitad - b.mitad)
                    .map((mitad) => (
                      <li key={mitad.id}>
                        ½ {mitad.producto?.nombre ?? '—'}
                        {mitad.extras.map((extra) => (
                          <span key={extra.id} className={styles.extraTag}>
                            + {extra.ingrediente?.nombre ?? 'extra'} ×{extra.cantidad}
                          </span>
                        ))}
                      </li>
                    ))}
                </ul>
              )}

              {detalle.extras.length > 0 && (
                <ul className={styles.subList}>
                  {detalle.extras.map((extra) => (
                    <li key={extra.id}>
                      + {extra.ingrediente?.nombre ?? 'extra'} ×{extra.cantidad} (
                      {formatearMonto(extra.precio_extra)})
                      {editable && (
                        <button
                          className={styles.link}
                          type="button"
                          aria-label={`Quitar extra ${extra.ingrediente?.nombre ?? ''}`}
                          onClick={() => onQuitarExtra(detalle.id, extra.id)}
                        >
                          quitar
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}

              {detalle.notas && <p className={styles.muted}>Nota: {detalle.notas}</p>}
            </div>
            <div className={styles.itemPrice}>
              <span className={styles.muted}>{formatearMonto(detalle.precio_unitario)} c/u</span>
              <strong>{formatearMonto(detalle.subtotal)}</strong>
              {onQuitarDetalle && (
                <button
                  className={styles.link}
                  type="button"
                  aria-label={`Quitar ${tituloDe(detalle, combos)}`}
                  onClick={() => onQuitarDetalle(detalle.id)}
                >
                  quitar
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>

      {descuento !== undefined && descuento > 0 && (
        <div className={styles.totalRow}>
          <span className={styles.muted}>Descuento</span>
          <span>-{formatearMonto(descuento)}</span>
        </div>
      )}

      {envio && envio.costo > 0 && (
        <div className={styles.totalRow}>
          <span className={styles.muted}>Envío{envio.repartidor ? ` · ${envio.repartidor}` : ''}</span>
          <span>{formatearMonto(envio.costo)}</span>
        </div>
      )}

      <div className={styles.totalRow}>
        <span>Total</span>
        <strong>{formatearMonto(total)}</strong>
      </div>
    </div>
  )
}