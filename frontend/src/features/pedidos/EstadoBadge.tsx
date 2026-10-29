import type { EstadoPedidoNombre } from '../../api.ts'
import { ETIQUETA_ESTADO } from './estados.ts'
import styles from './Pedidos.module.css'

const CLASE: Record<EstadoPedidoNombre, string> = {
  pendiente: styles.estadoPendiente,
  confirmado: styles.estadoConfirmado,
  en_preparacion: styles.estadoPreparacion,
  listo: styles.estadoListo,
  entregado: styles.estadoEntregado,
  cancelado: styles.estadoCancelado,
}

export function EstadoBadge({ estado }: { estado: EstadoPedidoNombre | null }) {
  if (!estado) return <span className={`${styles.badge} ${styles.estadoPendiente}`}>—</span>
  return <span className={`${styles.badge} ${CLASE[estado]}`}>{ETIQUETA_ESTADO[estado]}</span>
}