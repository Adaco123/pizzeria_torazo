import type { DetallePedido } from '../../api.ts'
import styles from './Cocina.module.css'

interface Props {
  detalles: DetallePedido[]
  nombresCombos: Record<number, string>
}

function titulo(detalle: DetallePedido, nombresCombos: Record<number, string>): string {
  if (detalle.is_mitad) return 'Pizza mitad y mitad'
  if (detalle.combo_id !== null) return nombresCombos[detalle.combo_id] ?? `Combo #${detalle.combo_id}`
  return detalle.producto_nombre ?? 'Producto'
}

/** Lo que hay que preparar, sin precios. */
export function ItemsCocina({ detalles, nombresCombos }: Props) {
  if (detalles.length === 0) return <p className={styles.vacio}>Este pedido no tiene productos.</p>

  return (
    <ul className={styles.items}>
      {detalles.map((detalle) => (
        <li key={detalle.id} className={styles.item}>
          <strong className={styles.cantidad}>{detalle.cantidad}×</strong>
          <div className={styles.itemCuerpo}>
            <span className={styles.itemNombre}>
              {titulo(detalle, nombresCombos)}
              {detalle.tamano_nombre ? ` (${detalle.tamano_nombre})` : ''}
            </span>

            {[...detalle.mitades]
              .sort((a, b) => a.mitad - b.mitad)
              .map((mitad) => (
                <span key={mitad.id} className={styles.sub}>
                  ½ {mitad.producto?.nombre ?? '—'}
                  {mitad.extras.map((extra) => (
                    <em key={extra.id} className={styles.extra}>
                      {' '}
                      + {extra.ingrediente?.nombre ?? 'extra'} ×{extra.cantidad}
                    </em>
                  ))}
                </span>
              ))}

            {detalle.extras.map((extra) => (
              <span key={extra.id} className={styles.sub}>
                + {extra.ingrediente?.nombre ?? 'extra'} ×{extra.cantidad}
              </span>
            ))}

            {detalle.notas && <span className={styles.nota}>Nota: {detalle.notas}</span>}
          </div>
        </li>
      ))}
    </ul>
  )
}