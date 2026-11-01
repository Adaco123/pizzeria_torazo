import { useState } from 'react'
import { pedidosApi } from '../../../apis/pedidos.ts'
import type { Cliente } from '../../../apis/clientes.ts'
import type { Combo } from '../../../apis/combos.ts'
import { useToast } from '../../../toast/toast-context.ts'
import { descargarBlob } from '../../../utils/archivos.ts'
import { formatearMonto } from '../../../utils/formato.ts'
import { enlaceWhatsapp, mensajeDePedido } from '../../../utils/whatsapp.ts'
import { FacturaPanel } from '../../cobro/FacturaPanel.tsx'
import { useFactura } from '../../cobro/useFactura.ts'
import { DetalleItems } from '../../pedidos/DetalleItems.tsx'
import { ETIQUETA_ESTADO, esFinal, estadoDe } from '../../pedidos/estados.ts'
import { usePedido } from '../../pedidos/usePedidos.ts'
import { Hoja } from '../Hoja.tsx'
import styles from './Riel.module.css'

interface Props {
  pedidoId: number
  combos: Combo[]
  clientes: Cliente[]
  usuarioId: number
  esAdmin: boolean
  onCerrar: () => void
  onCambio: () => void
}

/** Detalle de un pedido ya cobrado: ticket, aviso por WhatsApp, entrega, cancelación y factura. */
export function DetallePedidoHoja({ pedidoId, combos, clientes, usuarioId, esAdmin, onCerrar, onCambio }: Props) {
  const toast = useToast()
  const { pedido, error, recargar } = usePedido(pedidoId)
  const factura = useFactura(pedidoId)
  const [ocupado, setOcupado] = useState(false)
  const [cancelando, setCancelando] = useState(false)
  const [motivo, setMotivo] = useState('')

  const estado = pedido ? estadoDe(pedido) : null
  // Misma regla que el servidor: el cajero cancela hasta que cocina lo deja listo; el administrador siempre.
  const sePuedeCancelar = estado === 'confirmado' || estado === 'en_preparacion' || (estado === 'listo' && esAdmin)
  const cliente = pedido ? clientes.find((c) => c.id === pedido.cliente_id) : undefined
  const mensaje = pedido ? mensajeDePedido(pedido, cliente?.nombre ?? null) : null
  const enlace = mensaje && cliente && estado !== 'entregado' ? enlaceWhatsapp(cliente.telefono, mensaje) : null

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
      onCambio()
    }
  }

  async function ticket() {
    setOcupado(true)
    try {
      descargarBlob(await pedidosApi.ticketCliente(pedidoId), `ticket-${pedido?.numero_turno ?? pedidoId}.pdf`)
    } catch (e) {
      toast.error(e)
    } finally {
      setOcupado(false)
    }
  }

  async function cancelar() {
    if (factura.factura) return toast.error('Anula la factura antes de cancelar el pedido')
    if (motivo.trim().length < 3) return toast.error('Escribe el motivo de la cancelación')
    await accion(() => pedidosApi.cambiarEstado(pedidoId, 'cancelado', motivo.trim()), 'Pedido cancelado')
    setCancelando(false)
    setMotivo('')
  }

  async function entregar() {
    // Otro usuario pudo cambiarlo mientras tanto: se confirma el estado antes de entregar.
    const actual = await pedidosApi.obtener(pedidoId)
    if (estadoDe(actual) !== 'listo') return toast.error('El pedido cambió de estado. Se actualizó.')
    await accion(() => pedidosApi.cambiarEstado(pedidoId, 'entregado'), 'Pedido entregado')
  }

  return (
    <Hoja titulo={pedido ? `Pedido #${pedido.numero_turno ?? pedido.id}` : 'Pedido'} onCerrar={onCerrar}>
      {error && <p className={styles.error} role="alert">{error}</p>}
      {!pedido && !error && <p className={styles.vacio}>Cargando…</p>}
      {pedido && (
        <div className={styles.detalle}>
          <p className={styles.resumen}>
            <span className={styles.estado}>{estado ? ETIQUETA_ESTADO[estado] : '—'}</span>
            <b>{cliente?.nombre ?? `Cliente #${pedido.cliente_id}`}</b>
            <span>
              {pedido.mesa_numero !== null ? `Mesa ${pedido.mesa_numero}` : pedido.tipo_entrega?.nombre}
              {pedido.tipo_entrega?.nombre === 'Domicilio' && pedido.direccion_entrega && ` · ${pedido.direccion_entrega}`}
            </span>
            <span>
              {pedido.total > 0 && pedido.pagado >= pedido.total ? 'Pagado' : 'Sin cobrar'} · {formatearMonto(pedido.total)}
            </span>
          </p>

          <DetalleItems
            detalles={pedido.detalles}
            total={pedido.total}
            descuento={pedido.descuento}
            envio={{ costo: pedido.costo_envio, repartidor: pedido.repartidor?.nombre }}
            combos={combos}
            editable={false}
            onQuitarExtra={() => {}}
          />

          <div className={styles.acciones}>
            {estado === 'listo' && (
              <button type="button" className={styles.primario} disabled={ocupado} onClick={() => void entregar()}>
                Entregar
              </button>
            )}
            <button type="button" className={styles.secundario} disabled={ocupado} onClick={() => void ticket()}>
              Ticket
            </button>
            {enlace && (
              <a className={styles.secundario} href={enlace} target="_blank" rel="noreferrer">
                Avisar por WhatsApp
              </a>
            )}
            {sePuedeCancelar && !cancelando && (
              <button type="button" className={styles.peligro} disabled={ocupado} onClick={() => setCancelando(true)}>
                Cancelar pedido
              </button>
            )}
          </div>
          {estado === 'listo' && !esAdmin && (
            <p className={styles.nota}>Ya está listo: solo el administrador puede cancelarlo.</p>
          )}

          {cancelando && (
            <div className={styles.cancelar}>
              <label htmlFor="motivo-cancelar">Motivo de la cancelación (se devuelve lo cobrado)</label>
              <textarea id="motivo-cancelar" rows={2} value={motivo} onChange={(e) => setMotivo(e.target.value)} />
              <div className={styles.acciones}>
                <button type="button" className={styles.peligro} disabled={ocupado} onClick={() => void cancelar()}>
                  Confirmar cancelación
                </button>
                <button type="button" className={styles.secundario} onClick={() => setCancelando(false)}>
                  Volver
                </button>
              </div>
            </div>
          )}

          {!esFinal(estado) || estado === 'entregado' ? (
            <FacturaPanel pedido={pedido} usuarioId={usuarioId} esAdmin={esAdmin} clientes={clientes} factura={factura} />
          ) : null}
        </div>
      )}
    </Hoja>
  )
}
