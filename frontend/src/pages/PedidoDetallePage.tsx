import { ArrowLeft, Ban, ChefHat, Clock, MessageCircle, PackageCheck, Pencil, Phone, Printer, ReceiptText, Store, Truck, User } from 'lucide-react'
import { enlaceWhatsapp, mensajeDePedido } from '../utils/whatsapp.ts'
import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { pedidosApi } from '../apis/pedidos.ts'
import { useAuth } from '../auth/auth-context.ts'
import { minutosParaPromesa, textoHoraPrometida, textoPromesa } from '../features/cocina/tiempo.ts'
import { useAhora } from '../features/cocina/useCocina.ts'
import { FacturaPanel } from '../features/cobro/FacturaPanel.tsx'
import { useFactura } from '../features/cobro/useFactura.ts'
import { DetalleItems } from '../features/pedidos/DetalleItems.tsx'
import { EstadoBadge } from '../features/pedidos/EstadoBadge.tsx'
import { esFinal, estadoDe } from '../features/pedidos/estados.ts'
import ui from '../features/admin/Ui.module.css'
import { Cabeza } from '../features/admin/ui.tsx'
import detalle from '../features/pedidos/PedidoDetalle.module.css'
import styles from '../features/pedidos/Pedidos.module.css'
import { useCatalogo } from '../features/pedidos/useCatalogo.ts'
import { useClientes, usePedido } from '../features/pedidos/usePedidos.ts'
import { useToast } from '../toast/toast-context.ts'
import { descargarBlob } from '../utils/archivos.ts'
import { formatearFecha, formatearMonto } from '../utils/formato.ts'

/** Minutos (desde ahora) que se ofrecen al cambiar la hora prometida. */
const CAMBIOS_DE_ESPERA = [5, 10, 15, 20, 30, 45, 60]

function PedidoDetalle({ id }: { id: number }) {
  const { sesion, hasRole } = useAuth()
  const toast = useToast()
  const esAdmin = hasRole('Administrador')
  const { pedido, cargando, error, recargar } = usePedido(id)
  const { catalogo } = useCatalogo()
  const { clientes } = useClientes()
  const factura = useFactura(id)
  const [ocupado, setOcupado] = useState(false)
  const ahora = useAhora()

  const volver = (
    <div className={detalle.barra}>
      <Link to="/pedidos" className={detalle.volver}>
        <ArrowLeft size={16} aria-hidden="true" /> Pedidos
      </Link>
    </div>
  )

  if (cargando) return <p className={styles.muted}>Cargando pedido…</p>
  if (error || !pedido) {
    return (
      <section className={styles.page}>
        {volver}
        <p className={styles.error} role="alert">
          {error ?? 'No se encontró el pedido'}
        </p>
      </section>
    )
  }

  // El cajero solo puede abrir sus propios pedidos.
  if (!esAdmin && pedido.usuario_id !== sesion?.id && pedido.cuenta_id === null) {
    return (
      <section className={styles.page}>
        {volver}
        <h1>Sin acceso</h1>
        <p>Este pedido lo registró otro usuario.</p>
      </section>
    )
  }

  const estado = estadoDe(pedido)
  const cliente = clientes.find((c) => c.id === pedido.cliente_id)
  const borrador = estado === 'pendiente'
  // Misma regla que el servidor: el cajero cancela hasta que cocina lo deja listo; el administrador siempre.
  const sePuedeCancelar =
    estado === 'pendiente' ||
    estado === 'confirmado' ||
    estado === 'en_preparacion' ||
    (estado === 'listo' && esAdmin)

  async function accion(tarea: () => Promise<unknown>, exito: string) {
    setOcupado(true)
    try {
      await tarea()
      toast.exito(exito)
    } catch (e) {
      toast.error(e)
    } finally {
      setOcupado(false)
      recargar()
      factura.recargar()
    }
  }

  async function cambiarEspera(minutos: number) {
    await accion(() => pedidosApi.cambiarHoraPrometida(id, minutos), `Nueva espera: ${minutos} min desde ahora`)
  }

  async function entregar() {
    await accion(() => pedidosApi.cambiarEstado(id, 'entregado'), 'Pedido entregado')
  }

  async function cancelar() {
    if (factura.factura) {
      toast.error('Anula la factura antes de cancelar el pedido')
      return
    }
    let motivo: string | undefined
    if (borrador) {
      if (!window.confirm('¿Cancelar este pedido?')) return
    } else {
      // Ya está cobrado: se devuelve el dinero, así que queda escrito por qué.
      const escrito = window.prompt('Motivo de la cancelación (se devuelve lo cobrado):')
      if (escrito === null) return
      if (escrito.trim().length < 3) {
        toast.error('Escribe el motivo de la cancelación')
        return
      }
      motivo = escrito.trim()
    }
    await accion(() => pedidosApi.cambiarEstado(id, 'cancelado', motivo), 'Pedido cancelado')
  }

  async function descargarTicket() {
    setOcupado(true)
    try {
      const pdf = await pedidosApi.ticketCocina(id)
      descargarBlob(pdf, `ticket-cocina-${pedido?.numero_turno ?? id}.pdf`)
    } catch (e) {
      toast.error(e)
    } finally {
      setOcupado(false)
    }
  }

  const mensajeWhatsapp = mensajeDePedido(pedido, cliente?.nombre ?? null)
  const avisoWhatsapp = mensajeWhatsapp ? enlaceWhatsapp(cliente?.telefono, mensajeWhatsapp) : null

  async function descargarTicketCliente() {
    setOcupado(true)
    try {
      const pdf = await pedidosApi.ticketCliente(id)
      descargarBlob(pdf, `ticket-${pedido?.numero_turno ?? id}.pdf`)
    } catch (e) {
      toast.error(e)
    } finally {
      setOcupado(false)
    }
  }

  const pagado = !borrador && pedido.pagado >= pedido.total && pedido.total > 0
  const entrega = pedido.tipo_entrega?.nombre ?? '—'
  const EntregaIcono = pedido.direccion_entrega ? Truck : Store

  return (
    <section className={`${styles.page} ${styles.pageAncha}`}>
      <div className={detalle.barra}>
        <Link to="/pedidos" className={detalle.volver}>
          <ArrowLeft size={16} aria-hidden="true" /> Pedidos
        </Link>
        <h1 className={detalle.titulo}>{pedido.numero_turno ? `Ficha N° ${pedido.numero_turno}` : 'Pedido sin cobrar'}</h1>
        <EstadoBadge estado={estado} />
        {pagado && <span className={`${styles.badge} ${styles.estadoListo}`}>Pagado</span>}
      </div>

      <div className={detalle.layout}>
        <aside className={detalle.riel} aria-label="Cliente y entrega">
          <h2>Cliente y entrega</h2>
          <div className={detalle.dato}>
            <User size={16} aria-hidden="true" />
            <div>
              <b>{cliente?.nombre ?? `Cliente #${pedido.cliente_id}`}</b>
              <small>Cliente · {formatearFecha(pedido.fecha)}</small>
            </div>
          </div>
          {cliente?.telefono && (
            <div className={detalle.dato}>
              <Phone size={16} aria-hidden="true" />
              <div>
                <b>{cliente.telefono}</b>
                <small>Teléfono</small>
              </div>
            </div>
          )}
          <div className={detalle.dato}>
            <EntregaIcono size={16} aria-hidden="true" />
            <div>
              <b>{entrega}</b>
              {pedido.direccion_entrega && <small>{pedido.direccion_entrega}</small>}
            </div>
          </div>
          {pedido.hora_prometida && (
            <div className={detalle.dato}>
              <Clock size={16} aria-hidden="true" />
              <div>
                <b>{textoHoraPrometida(pedido.hora_prometida)}</b>
                {estado !== 'entregado' && estado !== 'cancelado' && (
                  <small>{textoPromesa(minutosParaPromesa(pedido.hora_prometida, ahora))}</small>
                )}
              </div>
            </div>
          )}
          {(estado === 'confirmado' || estado === 'en_preparacion' || estado === 'listo') && (
            <div className={detalle.espera}>
              <span>Cambiar la espera (min desde ahora)</span>
              <div className={detalle.chips} role="group" aria-label="Cambiar la hora prometida">
                {CAMBIOS_DE_ESPERA.map((minutos) => (
                  <button
                    key={minutos}
                    type="button"
                    className={detalle.chip}
                    disabled={ocupado}
                    onClick={() => void cambiarEspera(minutos)}
                  >
                    {minutos}
                  </button>
                ))}
              </div>
            </div>
          )}
          {pedido.motivo_cancelacion && (
            <p className={detalle.motivo}>Motivo de la cancelación: {pedido.motivo_cancelacion}</p>
          )}
        </aside>

        <div className={detalle.centro}>
          <section className={styles.card}>
            <Cabeza icono={ReceiptText} titulo="Detalle" cuenta={pedido.detalles.length} />
            <DetalleItems
              detalles={pedido.detalles}
              total={pedido.total}
              descuento={pedido.descuento}
              envio={{ costo: pedido.costo_envio, repartidor: pedido.repartidor?.nombre }}
              combos={catalogo?.combos ?? []}
              editable={false}
              onQuitarExtra={() => {}}
            />
          </section>

          {sesion && !borrador && (
            <FacturaPanel
              pedido={pedido}
              usuarioId={sesion.id}
              esAdmin={esAdmin}
              clientes={clientes}
              factura={factura}
            />
          )}
        </div>

        <aside className={detalle.ticket} aria-label="Acciones del pedido">
          <div className={detalle.cabeza}>
            <h2>Acciones</h2>
          </div>
          <dl className={detalle.fichas}>
            <div className={detalle.ficha}>
              <dt>{borrador ? 'Total' : 'Cobrado'}</dt>
              <dd>{formatearMonto(borrador ? pedido.total : pedido.pagado)}</dd>
            </div>
            <div className={detalle.ficha}>
              <dt>Entrega</dt>
              <dd>{entrega}</dd>
            </div>
          </dl>
          <div className={detalle.pie}>
            {estado === 'listo' && (
              <button className={detalle.grande} type="button" disabled={ocupado} onClick={entregar}>
                <PackageCheck size={18} aria-hidden="true" /> Entregar
              </button>
            )}
            {borrador && (
              <Link to="/pedidos" className={`${ui.btn} ${ui.secundario}`}>
                <Pencil size={16} aria-hidden="true" /> Seguir armándolo en caja
              </Link>
            )}
            {!borrador && (
              <button className={`${ui.btn} ${ui.secundario}`} type="button" disabled={ocupado} onClick={descargarTicketCliente}>
                <Printer size={16} aria-hidden="true" /> Ticket del cliente (PDF)
              </button>
            )}
            {!borrador && (
              <button className={`${ui.btn} ${ui.secundario}`} type="button" disabled={ocupado} onClick={descargarTicket}>
                <ChefHat size={16} aria-hidden="true" /> Ficha de cocina (PDF)
              </button>
            )}
            {avisoWhatsapp && (
              <a className={`${ui.btn} ${ui.secundario}`} href={avisoWhatsapp} target="_blank" rel="noreferrer">
                <MessageCircle size={16} aria-hidden="true" /> Avisar por WhatsApp
              </a>
            )}
            {!esFinal(estado) && sePuedeCancelar && (
              <button className={`${ui.btn} ${ui.secundario} ${detalle.peligro}`} type="button" disabled={ocupado} onClick={cancelar}>
                <Ban size={16} aria-hidden="true" /> Cancelar pedido
              </button>
            )}
            {estado === 'listo' && !esAdmin && (
              <p className={detalle.nota}>Ya está listo: solo el administrador puede cancelarlo.</p>
            )}
          </div>
        </aside>
      </div>
    </section>
  )
}

export function PedidoDetallePage() {
  const { id } = useParams()
  const pedidoId = Number(id)

  if (!Number.isInteger(pedidoId) || pedidoId < 1) {
    return (
      <section className={styles.page}>
        <div className={detalle.barra}>
          <Link to="/pedidos" className={detalle.volver}>
            <ArrowLeft size={16} aria-hidden="true" /> Pedidos
          </Link>
        </div>
        <h1>Pedido no válido</h1>
      </section>
    )
  }

  // `key` reinicia todo el estado si se navega de un pedido a otro.
  return <PedidoDetalle key={pedidoId} id={pedidoId} />
}
