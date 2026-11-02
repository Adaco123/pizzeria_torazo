import { Bike, UtensilsCrossed } from 'lucide-react'
import type { Pedido } from '../../../apis/pedidos.ts'
import { AnilloTiempo } from '../AnilloTiempo.tsx'
import { resumenItems } from '../items.ts'
import { minutosDesde, minutosParaPromesa, progresoPedido, textoPromesa, textoTiempo } from '../tiempo.ts'
import styles from './Riel.module.css'

interface Props {
  pedido: Pedido
  ahora: number
  elegida: boolean
  onElegir: () => void
}

/** Un pedido de la lista: el anillo de tiempo, de dónde es y qué lleva. Tocarlo lo pone en el centro. */
export function FilaCocina({ pedido, ahora, elegida, onElegir }: Props) {
  const progreso = progresoPedido(pedido, ahora)
  const domicilio = pedido.tipo_entrega?.nombre === 'Domicilio'
  const tiempo = pedido.hora_prometida
    ? textoPromesa(minutosParaPromesa(pedido.hora_prometida, ahora))
    : textoTiempo(minutosDesde(pedido.fecha, ahora))

  return (
    <li>
      <button
        type="button"
        className={`${styles.fila} ${progreso.atrasado ? styles.urgente : ''} ${elegida ? styles.elegida : ''}`}
        aria-current={elegida || undefined}
        onClick={onElegir}
      >
        <AnilloTiempo progreso={progreso} />
        <span className={styles.datos}>
          <b>N° {pedido.numero_turno}</b>
          <small>
            {pedido.mesa_numero !== null ? (
              `Mesa ${pedido.mesa_numero}`
            ) : domicilio ? (
              <>
                <Bike size={12} aria-hidden="true" /> Domicilio
              </>
            ) : (
              <>
                <UtensilsCrossed size={12} aria-hidden="true" /> {pedido.tipo_entrega?.nombre ?? 'Local'}
              </>
            )}
          </small>
          <small>{resumenItems(pedido.detalles)}</small>
          <small className={progreso.atrasado ? styles.atrasado : undefined}>{tiempo}</small>
        </span>
      </button>
    </li>
  )
}
