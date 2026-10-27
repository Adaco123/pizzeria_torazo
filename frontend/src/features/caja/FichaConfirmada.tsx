import { useState } from 'react'
import { Link } from 'react-router'
import { pedidosApi } from '../../api.ts'
import type { CobroResultado } from '../../api.ts'
import { useToast } from '../../toast/toast-context.ts'
import { descargarBlob } from '../../utils/archivos.ts'
import { formatearMonto } from '../../utils/formato.ts'
import { textoHoraPrometida } from '../cocina/tiempo.ts'
import base from '../pedidos/Pedidos.module.css'
import styles from './Caja.module.css'

interface Props {
  resultado: CobroResultado
  onNuevo: () => void
}

/** Lo que el cajero necesita después de cobrar: el número para la fichita y el vuelto. */
export function FichaConfirmada({ resultado, onNuevo }: Props) {
  const toast = useToast()
  const [descargando, setDescargando] = useState(false)
  const { pedido, vuelto } = resultado

  async function descargarTicket() {
    setDescargando(true)
    try {
      const pdf = await pedidosApi.ticketCocina(pedido.id)
      descargarBlob(pdf, `ticket-cocina-${pedido.numero_turno ?? pedido.id}.pdf`)
    } catch (e) {
      toast.error(e)
    } finally {
      setDescargando(false)
    }
  }

  return (
    <section className={`${base.card} ${styles.confirmada}`} aria-label="Pedido cobrado">
      <p className={styles.exito}>Cobrado {formatearMonto(pedido.pagado)}</p>

      <div>
        <span className={base.muted}>Escribe este número en la ficha</span>
        <p className={styles.fichaGrande}>{pedido.numero_turno ?? '—'}</p>
      </div>

      {vuelto > 0 && (
        <p className={styles.vuelto}>
          Entrega de vuelto <strong>{formatearMonto(vuelto)}</strong>
        </p>
      )}

      <p className={base.muted}>
        Enviado a cocina · {pedido.tipo_entrega?.nombre ?? 'Local'}
        {pedido.direccion_entrega ? ` · ${pedido.direccion_entrega}` : ''}
        {pedido.costo_envio > 0 ? ` · Envío ${formatearMonto(pedido.costo_envio)}` : ''}
        {pedido.repartidor ? ` · Reparte ${pedido.repartidor.nombre}` : ''}
        {pedido.hora_prometida ? ` · ${textoHoraPrometida(pedido.hora_prometida)}` : ''}
      </p>

      <div className={styles.accionesFicha}>
        <button className={`${base.primary} ${styles.confirmar}`} type="button" onClick={onNuevo}>
          Nuevo pedido
        </button>
        <button className={base.secondary} type="button" disabled={descargando} onClick={descargarTicket}>
          {descargando ? 'Generando…' : 'Ticket de cocina (PDF)'}
        </button>
        <Link to={`/pedidos/${pedido.id}`} className={base.link}>
          Ver pedido
        </Link>
      </div>
    </section>
  )
}
