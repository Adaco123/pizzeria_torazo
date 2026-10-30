import { useState } from 'react'
import { facturasApi } from '../../apis/facturas.ts'
import type { Cliente } from '../../apis/clientes.ts'
import type { Pedido } from '../../apis/pedidos.ts'
import { useToast } from '../../toast/toast-context.ts'
import { formatearFecha, formatearMonto } from '../../utils/formato.ts'
import base from '../pedidos/Pedidos.module.css'
import { estadoDe } from '../pedidos/estados.ts'
import { crearFactura } from './facturacion.ts'
import type { EstadoFactura } from './useFactura.ts'
import styles from './Cobro.module.css'

interface Props {
  pedido: Pedido
  usuarioId: number
  esAdmin: boolean
  clientes: Cliente[]
  factura: EstadoFactura
}

/**
 * La factura es opcional: se emite solo cuando el cliente la pide, sobre un pedido ya cobrado.
 * Su total es exactamente lo cobrado, así que aquí solo se elige a nombre de quién sale.
 */
export function FacturaPanel({ pedido, usuarioId, esAdmin, clientes, factura: estado }: Props) {
  const toast = useToast()
  const { factura, anuladas, cargando, error, recargar } = estado
  const [clienteId, setClienteId] = useState(pedido.cliente_id)
  const [ocupado, setOcupado] = useState(false)

  const cancelado = estadoDe(pedido) === 'cancelado'
  const cobrado = estadoDe(pedido) !== 'pendiente' && pedido.pagado > 0

  async function emitir() {
    setOcupado(true)
    try {
      const nueva = await crearFactura({
        pedido_id: pedido.id,
        cliente_id: clienteId,
        usuario_id: usuarioId,
        subtotal: pedido.pagado,
        descuento: 0,
        impuesto: 0,
      })
      toast.exito(`Factura ${nueva.numero_factura} emitida`)
      recargar()
    } catch (e) {
      toast.error(e)
    } finally {
      setOcupado(false)
    }
  }

  async function anular() {
    if (!factura) return
    if (!window.confirm(`¿Anular la factura ${factura.numero_factura}?`)) return
    setOcupado(true)
    try {
      await facturasApi.anular(factura.id)
      toast.exito(`Factura ${factura.numero_factura} anulada`)
      recargar()
    } catch (e) {
      toast.error(e)
    } finally {
      setOcupado(false)
    }
  }

  if (cargando) {
    return (
      <section className={base.card}>
        <h2>Factura</h2>
        <p className={base.muted}>Cargando…</p>
      </section>
    )
  }

  if (error) {
    return (
      <section className={base.card}>
        <h2>Factura</h2>
        <div className={base.errorRow}>
          <p className={base.error} role="alert">
            {error}
          </p>
          <button className={base.secondary} type="button" onClick={recargar}>
            Reintentar
          </button>
        </div>
      </section>
    )
  }

  if (factura) {
    return (
      <section className={base.card}>
        <div className={base.headerRow}>
          <h2>Factura {factura.numero_factura}</h2>
          <span className={`${base.badge} ${base.estadoListo}`}>Emitida</span>
        </div>
        <p className={base.muted}>
          {formatearFecha(factura.fecha)} · a nombre de {factura.cliente?.nombre ?? `Cliente #${factura.cliente_id}`}
        </p>
        <dl className={styles.stats}>
          <div className={styles.statTotal}>
            <dt>Total facturado</dt>
            <dd>{formatearMonto(factura.total)}</dd>
          </div>
        </dl>
        {esAdmin && (
          <div className={base.formRow}>
            <button className={base.danger} type="button" disabled={ocupado} onClick={anular}>
              Anular factura
            </button>
          </div>
        )}
      </section>
    )
  }

  if (cancelado) return null

  return (
    <section className={base.card}>
      <h2>Factura</h2>
      {anuladas > 0 && (
        <p className={base.muted}>
          Este pedido tuvo {anuladas} factura{anuladas === 1 ? '' : 's'} anulada{anuladas === 1 ? '' : 's'}.
        </p>
      )}
      {!cobrado ? (
        <p className={base.muted}>La factura se puede emitir cuando el pedido esté cobrado.</p>
      ) : (
        <div className={base.formStack}>
          <p className={base.muted}>Solo si el cliente la pide. Se factura lo cobrado.</p>
          <div className={base.formRow}>
            <label className={`${base.field} ${base.grow}`}>
              <span>A nombre de</span>
              <select value={clienteId} onChange={(e) => setClienteId(Number(e.target.value))}>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre} · NIT {c.nit}
                  </option>
                ))}
              </select>
            </label>
            <button className={base.primary} type="button" disabled={ocupado} onClick={emitir}>
              {ocupado ? 'Emitiendo…' : `Emitir factura · ${formatearMonto(pedido.pagado)}`}
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
