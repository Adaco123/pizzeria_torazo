import { Bike, Check, Printer, UtensilsCrossed } from 'lucide-react'
import type { EstadoPedidoNombre, Pedido } from '../../../apis/pedidos.ts'
import { estadoDe } from '../../pedidos/estados.ts'
import { AnilloTiempo } from '../AnilloTiempo.tsx'
import { esPizza, nombreDetalle } from '../items.ts'
import { minutosDesde, minutosParaPromesa, progresoPedido, textoHoraPrometida, textoPromesa, textoTiempo } from '../tiempo.ts'
import { PizzaCirculo } from './PizzaCirculo.tsx'
import styles from './Foco.module.css'

interface Props {
  pedido: Pedido
  ahora: number
  nombresCombos: Record<number, string>
  /** Unidades ya sacadas del horno por línea del pedido (id del detalle → cantidad). */
  hechos: Record<number, number>
  ocupado: boolean
  onTocarDetalle: (detalleId: number, cantidad: number) => void
  onAvanzar: (desde: EstadoPedidoNombre, hacia: EstadoPedidoNombre) => void
  onTicket: () => void
}

const ACCION: Partial<Record<EstadoPedidoNombre, { siguiente: EstadoPedidoNombre; texto: string }>> = {
  confirmado: { siguiente: 'en_preparacion', texto: 'Empezar a preparar' },
  en_preparacion: { siguiente: 'listo', texto: 'Marcar listo' },
}

/** El pedido que se está trabajando, al centro: cada pizza como círculo, lo demás como botones, y la acción grande. */
export function PedidoFoco({ pedido, ahora, nombresCombos, hechos, ocupado, onTocarDetalle, onAvanzar, onTicket }: Props) {
  const estado = estadoDe(pedido)
  const accion = estado ? ACCION[estado] : undefined
  const preparando = estado === 'en_preparacion'
  const progreso = progresoPedido(pedido, ahora)
  const domicilio = pedido.tipo_entrega?.nombre === 'Domicilio'
  const paraLaHora = pedido.hora_prometida ? minutosParaPromesa(pedido.hora_prometida, ahora) : null
  const minutos = minutosDesde(pedido.fecha, ahora)

  const pizzas = pedido.detalles.filter(esPizza)
  const otros = pedido.detalles.filter((d) => !esPizza(d))
  const total = pedido.detalles.reduce((suma, d) => suma + d.cantidad, 0)
  const listas = pedido.detalles.reduce((suma, d) => suma + Math.min(hechos[d.id] ?? 0, d.cantidad), 0)

  return (
    <section className={styles.foco} aria-label={`Pedido N° ${pedido.numero_turno}`}>
      <header className={styles.cabeza}>
        <div>
          <h2 className={styles.titulo}>
            N° {pedido.numero_turno}
            <span className={styles.etiqueta}>
              {pedido.mesa_numero !== null ? (
                `Mesa ${pedido.mesa_numero}`
              ) : domicilio ? (
                <>
                  <Bike size={14} aria-hidden="true" /> Domicilio
                </>
              ) : (
                <>
                  <UtensilsCrossed size={14} aria-hidden="true" /> {pedido.tipo_entrega?.nombre ?? 'Local'}
                </>
              )}
            </span>
          </h2>
          <p className={styles.meta}>{textoTiempo(minutos)}</p>
          {pedido.hora_prometida && paraLaHora !== null && (
            <p className={paraLaHora < 0 ? styles.promesaAtrasada : styles.promesa}>
              {textoHoraPrometida(pedido.hora_prometida)} · {textoPromesa(paraLaHora)}
            </p>
          )}
        </div>
        <AnilloTiempo progreso={progreso} grande />
      </header>

      {pedido.detalles.length === 0 && <p className={styles.vacio}>Este pedido no tiene productos.</p>}

      {pizzas.length > 0 && (
        <ul className={styles.pizzas}>
          {pizzas.map((detalle) => (
            <PizzaCirculo
              key={detalle.id}
              detalle={detalle}
              hecho={hechos[detalle.id] ?? 0}
              interactivo={preparando}
              onTocar={() => onTocarDetalle(detalle.id, detalle.cantidad)}
            />
          ))}
        </ul>
      )}

      {otros.length > 0 && (
        <ul className={styles.otros}>
          {otros.map((detalle) => {
            const hecho = (hechos[detalle.id] ?? 0) >= detalle.cantidad
            return (
              <li key={detalle.id}>
                <button
                  type="button"
                  className={`${styles.otro} ${hecho ? styles.otroHecho : ''}`}
                  disabled={!preparando}
                  aria-pressed={preparando ? hecho : undefined}
                  onClick={() => onTocarDetalle(detalle.id, detalle.cantidad)}
                >
                  <span className={styles.otroIcono}>{hecho ? <Check size={16} aria-hidden="true" /> : `${detalle.cantidad}×`}</span>
                  {nombreDetalle(detalle, nombresCombos)}
                  {detalle.notas && <small>Nota: {detalle.notas}</small>}
                </button>
              </li>
            )
          })}
        </ul>
      )}

      <footer className={styles.pie}>
        <span className={styles.progreso}>
          {preparando ? (
            <>
              <b>{listas}</b> de <b>{total}</b> listos · toca cada pizza al sacarla del horno
            </>
          ) : (
            'Revisa el pedido y empieza cuando lo vayas a preparar'
          )}
        </span>
        <button type="button" className={styles.ticket} disabled={ocupado} onClick={onTicket}>
          <Printer size={16} aria-hidden="true" /> Ticket
        </button>
        {accion && estado && (
          <button
            type="button"
            className={preparando ? `${styles.avanzar} ${styles.avanzarListo}` : styles.avanzar}
            disabled={ocupado}
            onClick={() => onAvanzar(estado, accion.siguiente)}
          >
            {accion.texto}
          </button>
        )}
      </footer>
    </section>
  )
}
