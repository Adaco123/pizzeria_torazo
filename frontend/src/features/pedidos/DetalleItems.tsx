import { Trash2, X } from 'lucide-react'
import type { Combo } from '../../apis/combos.ts'
import type { DetallePedido } from '../../apis/pedidos.ts'
import { formatearMonto } from '../../utils/formato.ts'
import { BotonIcono } from '../admin/ui.tsx'
import styles from './DetalleItems.module.css'

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
    return <p className={styles.vacio}>Todavía no agregaste nada a este pedido.</p>
  }

  return (
    <div>
      <ul className={styles.lista}>
        {detalles.map((detalle) => (
          <li key={detalle.id} className={styles.fila}>
            <span className={styles.cantidad}>{detalle.cantidad}×</span>
            <div className={styles.texto}>
              <b>
                {tituloDe(detalle, combos)}
                {detalle.tamano_nombre ? ` (${detalle.tamano_nombre})` : ''}
              </b>

              {detalle.mitades.length > 0 && (
                <ul className={styles.sub}>
                  {[...detalle.mitades]
                    .sort((a, b) => a.mitad - b.mitad)
                    .map((mitad) => (
                      <li key={mitad.id}>
                        ½ {mitad.producto?.nombre ?? '—'}
                        {mitad.extras.map((extra) => (
                          <span key={extra.id} className={`${styles.etiqueta} ${styles.etiquetaFija}`}>
                            + {extra.ingrediente?.nombre ?? 'extra'} ×{extra.cantidad}
                          </span>
                        ))}
                      </li>
                    ))}
                </ul>
              )}

              {detalle.extras.length > 0 && (
                <div>
                  {detalle.extras.map((extra) => (
                    <span key={extra.id} className={`${styles.etiqueta} ${editable ? '' : styles.etiquetaFija}`}>
                      + {extra.ingrediente?.nombre ?? 'extra'} ×{extra.cantidad} ({formatearMonto(extra.precio_extra)})
                      {editable && (
                        <button
                          className={styles.quitarExtra}
                          type="button"
                          title="Quitar extra"
                          aria-label={`Quitar extra ${extra.ingrediente?.nombre ?? ''}`}
                          onClick={() => onQuitarExtra(detalle.id, extra.id)}
                        >
                          <X size={12} aria-hidden="true" />
                        </button>
                      )}
                    </span>
                  ))}
                </div>
              )}

              {detalle.notas && <p className={styles.nota}>Nota: {detalle.notas}</p>}
            </div>
            <div className={styles.precio}>
              <small>{formatearMonto(detalle.precio_unitario)} c/u</small>
              <b>{formatearMonto(detalle.subtotal)}</b>
            </div>
            {onQuitarDetalle && (
              <BotonIcono
                icono={Trash2}
                titulo={`Quitar ${tituloDe(detalle, combos)}`}
                tono="peligro"
                onClick={() => onQuitarDetalle(detalle.id)}
              />
            )}
          </li>
        ))}
      </ul>

      <div className={styles.totales}>
        {descuento !== undefined && descuento > 0 && (
          <div className={styles.linea}>
            <span>Descuento</span>
            <span>-{formatearMonto(descuento)}</span>
          </div>
        )}
        {envio && envio.costo > 0 && (
          <div className={styles.linea}>
            <span>Envío{envio.repartidor ? ` · ${envio.repartidor}` : ''}</span>
            <span>{formatearMonto(envio.costo)}</span>
          </div>
        )}
        <div className={`${styles.linea} ${styles.total}`}>
          <span>Total</span>
          <span>{formatearMonto(total)}</span>
        </div>
      </div>
    </div>
  )
}
