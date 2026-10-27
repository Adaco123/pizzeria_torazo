import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { pedidosApi } from '../api.ts'
import { useAuth } from '../auth/auth-context.ts'
import { minutosParaPromesa, textoHoraPrometida, textoPromesa } from '../features/cocina/tiempo.ts'
import { useAhora } from '../features/cocina/useCocina.ts'
import { FacturaPanel } from '../features/cobro/FacturaPanel.tsx'
import { useFactura } from '../features/cobro/useFactura.ts'
import { DetalleItems } from '../features/pedidos/DetalleItems.tsx'
import { EstadoBadge } from '../features/pedidos/EstadoBadge.tsx'
import { esFinal, estadoDe } from '../features/pedidos/estados.ts'
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
    <Link to="/pedidos" className={styles.back}>
      ← Volver a pedidos
    </Link>
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
  if (!esAdmin && pedido.usuario_id !== sesion?.id) {
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

  return (
    <section className={styles.page}>
      {volver}

      <section className={styles.card}>
        <div className={styles.headerRow}>
          <h1>{pedido.numero_turno ? `Ficha N° ${pedido.numero_turno}` : 'Pedido sin cobrar'}</h1>
          <span>
            <EstadoBadge estado={estado} />
            {!borrador && pedido.pagado >= pedido.total && pedido.total > 0 && (
              <>
                {' '}
                <span className={`${styles.badge} ${styles.estadoListo}`}>Pagado</span>
              </>
            )}
          </span>
        </div>
        <p className={styles.muted}>
          {formatearFecha(pedido.fecha)} · {cliente?.nombre ?? `Cliente #${pedido.cliente_id}`} ·{' '}
          {pedido.tipo_entrega?.nombre ?? '—'}
          {pedido.direccion_entrega ? ` · ${pedido.direccion_entrega}` : ''}
        </p>
        {!borrador && <p className={styles.muted}>Cobrado: {formatearMonto(pedido.pagado)}</p>}
        {pedido.hora_prometida && (
          <p className={styles.muted}>
            {textoHoraPrometida(pedido.hora_prometida)}
            {estado !== 'entregado' && estado !== 'cancelado' &&
              ` · ${textoPromesa(minutosParaPromesa(pedido.hora_prometida, ahora))}`}
          </p>
        )}
        {(estado === 'confirmado' || estado === 'en_preparacion' || estado === 'listo') && (
          <div className={styles.field}>
            <span>Cambiar la hora prometida (minutos desde ahora)</span>
            <div className={styles.chips} role="group" aria-label="Cambiar la hora prometida">
              {CAMBIOS_DE_ESPERA.map((minutos) => (
                <button
                  key={minutos}
                  type="button"
                  className={styles.chip}
                  disabled={ocupado}
                  onClick={() => void cambiarEspera(minutos)}
                >
                  {minutos} min
                </button>
              ))}
            </div>
          </div>
        )}
        {pedido.motivo_cancelacion && (
          <p className={styles.muted}>Motivo de la cancelación: {pedido.motivo_cancelacion}</p>
        )}

        <div className={styles.formRow}>
          {estado === 'listo' && (
            <button className={styles.primary} type="button" disabled={ocupado} onClick={entregar}>
              Entregar
            </button>
          )}
          {borrador && (
            <Link to="/pedidos" className={styles.secondary} style={{ textDecoration: "none" }}>
              Seguir armándolo en caja
            </Link>
          )}
          {!borrador && (
            <button className={styles.secondary} type="button" disabled={ocupado} onClick={descargarTicketCliente}>
              Ticket del cliente (PDF)
            </button>
          )}
          {!borrador && (
            <button className={styles.secondary} type="button" disabled={ocupado} onClick={descargarTicket}>
              Ficha de cocina (PDF)
            </button>
          )}
          {!esFinal(estado) && sePuedeCancelar && (
            <button className={styles.danger} type="button" disabled={ocupado} onClick={cancelar}>
              Cancelar pedido
            </button>
          )}
        </div>
        {estado === 'listo' && !esAdmin && (
          <p className={styles.muted}>Ya está listo: solo el administrador puede cancelarlo.</p>
        )}
      </section>

      <section className={styles.card}>
        <h2>Detalle</h2>
        <DetalleItems
          detalles={pedido.detalles}
          total={pedido.total}
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
    </section>
  )
}

export function PedidoDetallePage() {
  const { id } = useParams()
  const pedidoId = Number(id)

  if (!Number.isInteger(pedidoId) || pedidoId < 1) {
    return (
      <section className={styles.page}>
        <Link to="/pedidos" className={styles.back}>
          ← Volver a pedidos
        </Link>
        <h1>Pedido no válido</h1>
      </section>
    )
  }

  // `key` reinicia todo el estado si se navega de un pedido a otro.
  return <PedidoDetalle key={pedidoId} id={pedidoId} />
}
