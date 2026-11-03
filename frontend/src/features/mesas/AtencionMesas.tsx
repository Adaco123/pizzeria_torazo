import { Check, Wallet } from 'lucide-react'
import type { Mesa } from '../../apis/mesas.ts'
import type { ItemAtencion } from './estadoMesa.ts'
import styles from './Mesas.module.css'

interface Props {
  items: ItemAtencion[]
  elegidaMesaId: number | null
  ocupadoClave: string | null
  puedeCobrar: boolean
  onElegir: (mesa: Mesa) => void
  onEntregar: (item: ItemAtencion) => void
}

const CLASE = { entregar: styles.atEntregar, cobrar: styles.atCobrar, sinPedidos: styles.atSin } as const

/** Lo que pide atención ya mismo, con el botón para resolverlo sin abrir la mesa. */
export function AtencionMesas({ items, elegidaMesaId, ocupadoClave, puedeCobrar, onElegir, onEntregar }: Props) {
  return (
    <aside className={styles.atencion} aria-label="Atención">
      <h2>
        Atención <span className={items.length > 0 ? styles.atContador : styles.atContadorVacio}>{items.length}</span>
      </h2>
      <div className={styles.atLista} aria-live="polite">
        {items.length === 0 && <p className={styles.atVacio}>Todo al día</p>}
        {items.map((item) => (
          <article
            key={item.clave}
            className={`${styles.atFila} ${CLASE[item.tipo]} ${elegidaMesaId === item.mesa.id ? styles.atElegida : ''}`}
          >
            <button type="button" className={styles.atCuerpo} onClick={() => onElegir(item.mesa)}>
              <span className={styles.atNumero}>{item.mesa.numero}</span>
              <span className={styles.atDatos}>
                <b>Mesa {item.mesa.numero}</b>
                <small>{item.texto}</small>
              </span>
            </button>
            {item.tipo === 'entregar' && (
              <button
                type="button"
                className={styles.atAccion}
                disabled={ocupadoClave === item.clave}
                onClick={() => onEntregar(item)}
              >
                <Check size={16} aria-hidden="true" />
                {ocupadoClave === item.clave ? 'Entregando…' : 'Entregar'}
              </button>
            )}
            {item.tipo === 'cobrar' && puedeCobrar && (
              <button type="button" className={styles.atAccion} onClick={() => onElegir(item.mesa)}>
                <Wallet size={16} aria-hidden="true" />
                Cobrar
              </button>
            )}
          </article>
        ))}
      </div>
    </aside>
  )
}
