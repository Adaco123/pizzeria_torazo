import { Check, Printer } from 'lucide-react'
import type { Pedido } from '../../../apis/pedidos.ts'
import { minutosDesde } from '../tiempo.ts'
import styles from './Listos.module.css'

interface Props {
  pedidos: Pedido[]
  ahora: number
  ocupadoId: number | null
  onTicket: (pedido: Pedido) => void
}

/** Pedidos que ya salieron de cocina y esperan que los entreguen, con cuánto llevan esperando. */
export function PanelListos({ pedidos, ahora, ocupadoId, onTicket }: Props) {
  return (
    <section className={styles.listos} aria-label="Listos para entregar">
      <h2>
        Listos para entregar <span className={styles.contador}>{pedidos.length}</span>
      </h2>
      {pedidos.length === 0 ? (
        <p className={styles.vacio}>Aún no hay pedidos listos.</p>
      ) : (
        <ul className={styles.lista}>
          {pedidos.map((pedido) => {
            const espera = minutosDesde(pedido.updated_at, ahora)
            return (
              <li key={pedido.id} className={styles.listo}>
                <span className={styles.check}>
                  <Check size={18} aria-hidden="true" />
                </span>
                <span className={styles.datos}>
                  <b>N° {pedido.numero_turno}</b>
                  <small>
                    {pedido.mesa_numero !== null ? `Mesa ${pedido.mesa_numero}` : (pedido.tipo_entrega?.nombre ?? '—')}
                    {' · '}
                    {espera < 1 ? 'Recién listo' : `Esperando ${espera} min`}
                  </small>
                </span>
                <button type="button" disabled={ocupadoId === pedido.id} onClick={() => onTicket(pedido)}>
                  <Printer size={14} aria-hidden="true" /> Ticket
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
