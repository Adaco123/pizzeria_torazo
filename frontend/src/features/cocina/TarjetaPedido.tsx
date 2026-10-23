import type { EstadoPedidoNombre, Pedido } from '../../api.ts'
import { ItemsCocina } from './ItemsCocina.tsx'
import {
  MINUTOS_URGENTE,
  minutosDesde,
  minutosParaPromesa,
  textoHoraPrometida,
  textoPromesa,
  textoTiempo,
} from './tiempo.ts'
import styles from './Cocina.module.css'

const ACCION: Partial<Record<EstadoPedidoNombre, { siguiente: EstadoPedidoNombre; label: string }>> = {
  confirmado: { siguiente: 'en_preparacion', label: 'Empezar a preparar' },
  en_preparacion: { siguiente: 'listo', label: 'Marcar listo' },
}

interface Props {
  pedido: Pedido
  estado: EstadoPedidoNombre
  ahora: number
  nombresCombos: Record<number, string>
  ocupado: boolean
  onAvanzar: (pedido: Pedido, desde: EstadoPedidoNombre, hacia: EstadoPedidoNombre) => void
  onTicket: (pedido: Pedido) => void
}

export function TarjetaPedido({ pedido, estado, ahora, nombresCombos, ocupado, onAvanzar, onTicket }: Props) {
  const minutos = minutosDesde(pedido.fecha, ahora)
  const accion = ACCION[estado]
  // Con hora prometida, "urgente" es estar atrasado; sin ella (pedidos viejos) se usa la espera.
  const paraLaHora = pedido.hora_prometida ? minutosParaPromesa(pedido.hora_prometida, ahora) : null
  const urgente =
    estado !== 'listo' && (paraLaHora !== null ? paraLaHora < 0 : minutos >= MINUTOS_URGENTE)

  return (
    <article className={urgente ? `${styles.tarjeta} ${styles.tarjetaUrgente}` : styles.tarjeta}>
      <header className={styles.tarjetaCabecera}>
        <h3 className={styles.numero}>N° {pedido.numero_turno}</h3>
        <span className={styles.tipo}>{pedido.tipo_entrega?.nombre ?? '—'}</span>
        <span className={urgente ? styles.tiempoUrgente : styles.tiempo}>{textoTiempo(minutos)}</span>
      </header>

      {pedido.hora_prometida && paraLaHora !== null && (
        <p className={estado !== 'listo' && paraLaHora < 0 ? styles.promesaAtrasada : styles.promesa}>
          {textoHoraPrometida(pedido.hora_prometida)}
          {estado !== 'listo' && ` · ${textoPromesa(paraLaHora)}`}
        </p>
      )}

      <ItemsCocina detalles={pedido.detalles} nombresCombos={nombresCombos} />

      <footer className={styles.acciones}>
        {accion && (
          <button
            className={styles.primario}
            type="button"
            disabled={ocupado}
            onClick={() => onAvanzar(pedido, estado, accion.siguiente)}
          >
            {accion.label}
          </button>
        )}
        <button className={styles.secundario} type="button" disabled={ocupado} onClick={() => onTicket(pedido)}>
          Ticket
        </button>
        {!accion && <span className={styles.espera}>Esperando entrega</span>}
      </footer>
    </article>
  )
}