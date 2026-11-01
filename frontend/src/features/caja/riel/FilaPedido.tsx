import { Bike, Check, UtensilsCrossed } from 'lucide-react'
import type { Pedido } from '../../../apis/pedidos.ts'
import { formatearMonto } from '../../../utils/formato.ts'
import { minutosDesde, minutosParaPromesa, textoPromesa, textoTiempo } from '../../cocina/tiempo.ts'
import { estadoDe } from '../../pedidos/estados.ts'
import styles from './Riel.module.css'

interface Props {
  pedido: Pedido
  nombre: string
  ahora: number
  ocupado: boolean
  onAbrir: () => void
  onEntregar: () => void
}

const ETIQUETA = { confirmado: 'En cocina', en_preparacion: 'Preparando', listo: 'Listo', entregado: 'Entregado' } as const

/** Una tarjeta del riel: toda ella abre el detalle; «Entregar» solo aparece cuando está listo. */
export function FilaPedido({ pedido, nombre, ahora, ocupado, onAbrir, onEntregar }: Props) {
  const estado = estadoDe(pedido)
  const clave = estado === 'listo' || estado === 'entregado' ? estado : estado === 'en_preparacion' ? 'preparando' : 'cocina'
  const domicilio = pedido.tipo_entrega?.nombre === 'Domicilio'
  const pagado = pedido.total > 0 && pedido.pagado >= pedido.total
  const enCola = estado === 'confirmado' || estado === 'en_preparacion'
  const faltan = pedido.hora_prometida ? minutosParaPromesa(pedido.hora_prometida, ahora) : null

  let tiempo = ''
  if (estado !== 'entregado') {
    tiempo = textoTiempo(minutosDesde(pedido.fecha, ahora))
    if (enCola && faltan !== null) tiempo = textoPromesa(faltan)
  }

  return (
    <article className={`${styles.fila} ${styles[clave]}`}>
      <button type="button" className={styles.filaCuerpo} onClick={onAbrir} aria-label={`Pedido ${pedido.numero_turno ?? pedido.id}, ${nombre}`}>
        <span className={styles.numero}>{pedido.numero_turno ?? '—'}</span>
        <span className={styles.datos}>
          <b>{nombre}</b>
          <small>
            {pedido.mesa_numero !== null ? (
              `Mesa ${pedido.mesa_numero}`
            ) : domicilio ? (
              <>
                <Bike size={12} aria-hidden="true" /> Domicilio
              </>
            ) : (
              <>
                <UtensilsCrossed size={12} aria-hidden="true" /> Local
              </>
            )}
            {' · '}
            {formatearMonto(pedido.total)}
          </small>
          {(tiempo || !pagado) && (
            <small className={enCola && faltan !== null && faltan < 0 ? styles.atrasado : undefined}>
              {tiempo}
              {!pagado && <em>{tiempo ? ' · ' : ''}Sin cobrar</em>}
            </small>
          )}
        </span>
        {estado !== 'listo' && estado && estado in ETIQUETA && (
          <span className={styles.estado}>{ETIQUETA[estado as keyof typeof ETIQUETA]}</span>
        )}
      </button>
      {estado === 'listo' && (
        <button type="button" className={styles.entregar} disabled={ocupado} onClick={onEntregar}>
          <Check size={16} aria-hidden="true" />
          {ocupado ? 'Entregando…' : 'Entregar'}
        </button>
      )}
    </article>
  )
}
