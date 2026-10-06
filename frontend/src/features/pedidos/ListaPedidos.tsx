import { Link } from 'react-router'
import type { Pedido } from '../../api.ts'
import { formatearFecha, formatearMonto } from '../../utils/formato.ts'
import { EstadoBadge } from './EstadoBadge.tsx'
import { estadoDe } from './estados.ts'
import styles from './Pedidos.module.css'

interface Props {
  pedidos: Pedido[]
  /** cliente_id → nombre */
  nombres: Record<number, string>
}

export function ListaPedidos({ pedidos, nombres }: Props) {
  if (pedidos.length === 0) return <p className={styles.muted}>No hay pedidos para mostrar.</p>

  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>N°</th>
            <th>Hora</th>
            <th>Cliente</th>
            <th>Entrega</th>
            <th>Estado</th>
            <th>Total</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {pedidos.map((pedido) => (
            <tr key={pedido.id}>
              <td>{pedido.numero_turno}</td>
              <td>{formatearFecha(pedido.fecha)}</td>
              <td>{nombres[pedido.cliente_id] ?? `Cliente #${pedido.cliente_id}`}</td>
              <td>{pedido.tipo_entrega?.nombre ?? '—'}</td>
              <td>
                <EstadoBadge estado={estadoDe(pedido)} />
              </td>
              <td>{formatearMonto(pedido.total)}</td>
              <td>
                <Link to={`/pedidos/${pedido.id}`}>Abrir</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}