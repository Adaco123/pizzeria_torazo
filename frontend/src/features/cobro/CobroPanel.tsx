import { useState } from 'react'
import { facturasApi, pagosApi } from '../../api.ts'
import type { Pedido } from '../../api.ts'
import { useToast } from '../../toast/toast-context.ts'
import { formatearFecha, formatearMonto } from '../../utils/formato.ts'
import base from '../pedidos/Pedidos.module.css'
import { estadoDe } from '../pedidos/estados.ts'
import { TOLERANCIA } from './facturacion.ts'
import { GenerarFacturaForm } from './GenerarFacturaForm.tsx'
import { PagoForm } from './PagoForm.tsx'
import type { Cobro } from './useCobro.ts'
import styles from './Cobro.module.css'

interface Props {
  pedido: Pedido
  usuarioId: number
  esAdmin: boolean
  cobro: Cobro
}

export function CobroPanel({ pedido, usuarioId, esAdmin, cobro }: Props) {
  const toast = useToast()
  const { factura, pagos, metodos, anuladas, pagado, pendiente, cargando, error, recargar } = cobro
  const [ocupado, setOcupado] = useState(false)

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

  async function eliminarPago(pagoId: number) {
    if (!window.confirm('¿Eliminar este pago?')) return
    setOcupado(true)
    try {
      await pagosApi.eliminar(pagoId)
      toast.exito('Pago eliminado')
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
        <h2>Cobro</h2>
        <p className={base.muted}>Cargando cobro…</p>
      </section>
    )
  }

  if (error) {
    return (
      <section className={base.card}>
        <h2>Cobro</h2>
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

  // ---- Sin factura ---------------------------------------------------------
  if (!factura) {
    const cancelado = estadoDe(pedido) === 'cancelado'
    return (
      <section className={base.card}>
        <h2>Cobro</h2>
        {anuladas > 0 && (
          <p className={base.muted}>
            Este pedido tiene {anuladas} factura{anuladas === 1 ? '' : 's'} anulada
            {anuladas === 1 ? '' : 's'}.
          </p>
        )}
        {cancelado ? (
          <p className={base.muted}>Un pedido cancelado no se puede facturar.</p>
        ) : pedido.total <= 0 ? (
          <p className={base.muted}>Agrega productos al pedido para poder cobrarlo.</p>
        ) : (
          <GenerarFacturaForm pedido={pedido} usuarioId={usuarioId} onCreada={recargar} />
        )}
      </section>
    )
  }

  // ---- Con factura ---------------------------------------------------------
  const pagada = pendiente <= TOLERANCIA
  const desfasada = Math.abs(factura.subtotal - pedido.total) > TOLERANCIA

  return (
    <section className={base.card}>
      <div className={base.headerRow}>
        <h2>Cobro · Factura {factura.numero_factura}</h2>
        <span className={`${base.badge} ${pagada ? base.estadoListo : base.estadoPendiente}`}>
          {pagada ? 'Pagada' : 'Pendiente de pago'}
        </span>
      </div>
      <p className={base.muted}>Emitida el {formatearFecha(factura.fecha)}</p>

      {desfasada && (
        <p className={base.error} role="alert">
          El pedido cambió después de facturar (facturado {formatearMonto(factura.subtotal)}, pedido{' '}
          {formatearMonto(pedido.total)}). Anula la factura y genera una nueva.
        </p>
      )}

      <dl className={styles.stats}>
        <div>
          <dt>Subtotal</dt>
          <dd>{formatearMonto(factura.subtotal)}</dd>
        </div>
        <div>
          <dt>Descuento</dt>
          <dd>{formatearMonto(factura.descuento)}</dd>
        </div>
        <div>
          <dt>Impuesto</dt>
          <dd>{formatearMonto(factura.impuesto)}</dd>
        </div>
        <div className={styles.statTotal}>
          <dt>Total</dt>
          <dd>{formatearMonto(factura.total)}</dd>
        </div>
        <div>
          <dt>Pagado</dt>
          <dd>{formatearMonto(pagado)}</dd>
        </div>
        <div className={pagada ? undefined : styles.statPendiente}>
          <dt>Falta cobrar</dt>
          <dd>{formatearMonto(Math.max(0, pendiente))}</dd>
        </div>
      </dl>

      {pagos.length > 0 && (
        <div className={base.tableWrap}>
          <table className={base.table}>
            <thead>
              <tr>
                <th>Hora</th>
                <th>Método</th>
                <th>Monto</th>
                <th>Recibido</th>
                <th>Vuelto</th>
                {esAdmin && <th></th>}
              </tr>
            </thead>
            <tbody>
              {pagos.map((pago) => (
                <tr key={pago.id}>
                  <td>{formatearFecha(pago.fecha)}</td>
                  <td>
                    {pago.metodo?.nombre ??
                      metodos.find((m) => m.id === pago.metodo_id)?.nombre ??
                      `#${pago.metodo_id}`}
                  </td>
                  <td>{formatearMonto(pago.monto)}</td>
                  <td>{formatearMonto(pago.monto_recibido)}</td>
                  <td>{formatearMonto(pago.vuelto)}</td>
                  {esAdmin && (
                    <td>
                      <button
                        className={base.link}
                        type="button"
                        disabled={ocupado}
                        onClick={() => eliminarPago(pago.id)}
                      >
                        eliminar
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!pagada && !desfasada && (
        <PagoForm
          key={`${factura.id}-${pagos.length}`}
          factura={factura}
          pendiente={pendiente}
          metodos={metodos}
          usuarioId={usuarioId}
          onPagado={recargar}
        />
      )}

      {esAdmin && (
        <div className={base.formRow}>
          <button
            className={base.danger}
            type="button"
            disabled={ocupado || pagos.length > 0}
            onClick={anular}
          >
            Anular factura
          </button>
          {pagos.length > 0 && (
            <span className={base.muted}>Para anularla, elimina antes sus pagos.</span>
          )}
        </div>
      )}
    </section>
  )
}