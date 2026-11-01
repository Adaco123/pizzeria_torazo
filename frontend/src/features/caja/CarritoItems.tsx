import { Pizza, Trash2, X } from 'lucide-react'
import type { Combo } from '../../apis/combos.ts'
import type { DetallePedido } from '../../apis/pedidos.ts'
import { formatearMonto } from '../../utils/formato.ts'
import styles from './Ticket.module.css'

interface Props {
  detalles: DetallePedido[]
  combos: Combo[]
  onQuitarDetalle: (detalleId: number) => void
  onQuitarExtra: (detalleId: number, extraId: number) => void
}

function tituloDe(detalle: DetallePedido, combos: Combo[]): string {
  if (detalle.is_mitad) return 'Pizza mitad y mitad'
  if (detalle.combo_id !== null) {
    return combos.find((c) => c.id === detalle.combo_id)?.nombre ?? `Combo #${detalle.combo_id}`
  }
  return detalle.producto_nombre ?? 'Producto'
}

/** Las líneas del pedido: qué lleva cada una, sus extras y notas, y el botón para quitarla. */
export function CarritoItems({ detalles, combos, onQuitarDetalle, onQuitarExtra }: Props) {
  if (detalles.length === 0) {
    return (
      <div className={styles.vacio}>
        <Pizza size={36} aria-hidden="true" />
        <p>Todavía no hay productos</p>
        <small>Toca una pizza del menú para empezar</small>
      </div>
    )
  }

  return (
    <ul className={styles.lineas}>
      {detalles.map((detalle) => {
        const titulo = tituloDe(detalle, combos)
        return (
          <li key={detalle.id} className={styles.linea}>
            <div className={styles.lineaTexto}>
              <b>
                {detalle.cantidad}× {titulo}
                {detalle.tamano_nombre && <span className={styles.tamano}> · {detalle.tamano_nombre}</span>}
              </b>

              {[...detalle.mitades]
                .sort((a, b) => a.mitad - b.mitad)
                .map((mitad) => (
                  <small key={mitad.id}>
                    ½ {mitad.producto?.nombre ?? '—'}
                    {mitad.extras.map((extra) => (
                      <em key={extra.id} className={styles.extra}>
                        +{extra.ingrediente?.nombre ?? 'extra'}
                        {extra.cantidad > 1 ? ` ×${extra.cantidad}` : ''}
                      </em>
                    ))}
                  </small>
                ))}

              {detalle.extras.length > 0 && (
                <small>
                  {detalle.extras.map((extra) => (
                    <em key={extra.id} className={styles.extra}>
                      +{extra.ingrediente?.nombre ?? 'extra'}
                      {extra.cantidad > 1 ? ` ×${extra.cantidad}` : ''} · {formatearMonto(extra.precio_extra * extra.cantidad)}
                      <button
                        type="button"
                        aria-label={`Quitar extra ${extra.ingrediente?.nombre ?? ''}`}
                        onClick={() => onQuitarExtra(detalle.id, extra.id)}
                      >
                        <X size={12} aria-hidden="true" />
                      </button>
                    </em>
                  ))}
                </small>
              )}

              {detalle.notas && <span className={styles.nota}>{detalle.notas}</span>}
            </div>

            <div className={styles.lineaPrecio}>
              <b>{formatearMonto(detalle.subtotal)}</b>
              <button type="button" aria-label={`Quitar ${titulo}`} onClick={() => onQuitarDetalle(detalle.id)}>
                <Trash2 size={16} aria-hidden="true" />
              </button>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
