import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { pedidosApi } from '../api.ts'
import type { EstadoPedidoNombre } from '../api.ts'
import { useAuth } from '../auth/auth-context.ts'
import { CobroPanel } from '../features/cobro/CobroPanel.tsx'
import { useCobro } from '../features/cobro/useCobro.ts'
import { AgregarItemPanel } from '../features/pedidos/AgregarItemPanel.tsx'
import { DetalleItems } from '../features/pedidos/DetalleItems.tsx'
import { EstadoBadge } from '../features/pedidos/EstadoBadge.tsx'
import {
  esEditable,
  esFinal,
  estadoDe,
  ETIQUETA_ESTADO,
  siguienteEstado,
} from '../features/pedidos/estados.ts'
import styles from '../features/pedidos/Pedidos.module.css'
import { useCatalogo } from '../features/pedidos/useCatalogo.ts'
import { useClientes, usePedido } from '../features/pedidos/usePedidos.ts'
import { useToast } from '../toast/toast-context.ts'
import { descargarBlob } from '../utils/archivos.ts'
import { formatearFecha } from '../utils/formato.ts'

function PedidoDetalle({ id }: { id: number }) {
  const { sesion, hasRole } = useAuth()
  const toast = useToast()
  const { pedido, cargando, error, recargar } = usePedido(id)
  const { catalogo, error: errorCatalogo } = useCatalogo()
  const { clientes } = useClientes()
  const cobro = useCobro(id)
  const [ocupado, setOcupado] = useState(false)

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
  if (!hasRole('Administrador') && pedido.usuario_id !== sesion?.id) {
    return (
      <section className={styles.page}>
        {volver}
        <h1>Sin acceso</h1>
        <p>Este pedido lo registró otro usuario.</p>
      </section>
    )
  }

  const estado = estadoDe(pedido)
  const siguiente = siguienteEstado(estado)
  const facturado = cobro.factura !== null
  // Con una factura activa el pedido no se toca: la factura ya fijó el subtotal.
  const editable = esEditable(estado) && !facturado
  const cliente = clientes.find((c) => c.id === pedido.cliente_id)

  async function cambiarEstado(nuevo: EstadoPedidoNombre) {
    setOcupado(true)
    try {
      await pedidosApi.cambiarEstado(id, nuevo)
      toast.exito(`Pedido marcado como ${ETIQUETA_ESTADO[nuevo].toLowerCase()}`)
      recargar()
    } catch (e) {
      toast.error(e)
    } finally {
      setOcupado(false)
    }
  }

  async function cancelar() {
    if (facturado) {
      toast.error('Anula la factura antes de cancelar el pedido')
      return
    }
    if (!window.confirm('¿Cancelar este pedido?')) return
    await cambiarEstado('cancelado')
  }

  async function quitarExtra(detalleId: number, extraId: number) {
    try {
      await pedidosApi.quitarExtra(id, detalleId, extraId)
      toast.exito('Extra quitado')
      recargar()
    } catch (e) {
      toast.error(e)
    }
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

  return (
    <section className={styles.page}>
      {volver}

      <section className={styles.card}>
        <div className={styles.headerRow}>
          <h1>Pedido N° {pedido.numero_turno}</h1>
          <EstadoBadge estado={estado} />
        </div>
        <p className={styles.muted}>
          {formatearFecha(pedido.fecha)} · {cliente?.nombre ?? `Cliente #${pedido.cliente_id}`} ·{' '}
          {pedido.tipo_entrega?.nombre ?? '—'}
          {pedido.direccion_entrega ? ` · ${pedido.direccion_entrega}` : ''}
        </p>

        <div className={styles.formRow}>
          {siguiente && (
            <button
              className={styles.primary}
              type="button"
              disabled={ocupado}
              onClick={() => cambiarEstado(siguiente)}
            >
              Marcar como {ETIQUETA_ESTADO[siguiente].toLowerCase()}
            </button>
          )}
          <button className={styles.secondary} type="button" disabled={ocupado} onClick={descargarTicket}>
            Ticket de cocina (PDF)
          </button>
          {!esFinal(estado) && (
            <button className={styles.danger} type="button" disabled={ocupado} onClick={cancelar}>
              Cancelar pedido
            </button>
          )}
        </div>
      </section>

      <section className={styles.card}>
        <h2>Detalle</h2>
        <DetalleItems
          detalles={pedido.detalles}
          total={pedido.total}
          combos={catalogo?.combos ?? []}
          editable={editable}
          onQuitarExtra={quitarExtra}
        />
      </section>

      {sesion && (
        <CobroPanel
          pedido={pedido}
          usuarioId={sesion.id}
          esAdmin={hasRole('Administrador')}
          cobro={cobro}
        />
      )}

      {editable && catalogo && (
        <AgregarItemPanel pedidoId={id} catalogo={catalogo} onAgregado={recargar} />
      )}
      {editable && !catalogo && !errorCatalogo && (
        <p className={styles.muted}>Cargando catálogo…</p>
      )}
      {errorCatalogo && (
        <p className={styles.error} role="alert">
          No se pudo cargar el catálogo: {errorCatalogo}
        </p>
      )}
      {!editable && (
        <p className={styles.muted}>
          {facturado && esEditable(estado)
            ? 'Este pedido tiene una factura activa, por eso no se puede modificar. Anula la factura para cambiarlo.'
            : `Este pedido ya no se puede modificar porque está ${estado ? ETIQUETA_ESTADO[estado].toLowerCase() : 'cerrado'}.`}
        </p>
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