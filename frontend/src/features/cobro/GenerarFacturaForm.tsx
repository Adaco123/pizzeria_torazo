import { useState, type SubmitEvent } from 'react'
import type { Pedido } from '../../api.ts'
import { useToast } from '../../toast/toast-context.ts'
import { formatearMonto, parseMonto } from '../../utils/formato.ts'
import base from '../pedidos/Pedidos.module.css'
import { crearFactura, redondear, TOLERANCIA } from './facturacion.ts'

interface Props {
  pedido: Pedido
  usuarioId: number
  onCreada: () => void
}

export function GenerarFacturaForm({ pedido, usuarioId, onCreada }: Props) {
  const toast = useToast()
  const [descuento, setDescuento] = useState('')
  const [impuesto, setImpuesto] = useState('')
  const [enviando, setEnviando] = useState(false)

  const descuentoNum = descuento.trim() === '' ? 0 : parseMonto(descuento)
  const impuestoNum = impuesto.trim() === '' ? 0 : parseMonto(impuesto)
  const valido =
    descuentoNum !== null && impuestoNum !== null && descuentoNum <= pedido.total + TOLERANCIA
  const total = valido ? redondear(pedido.total - descuentoNum + impuestoNum) : null

  async function generar(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (descuentoNum === null || impuestoNum === null) {
      toast.error('Descuento e impuesto deben ser montos válidos (0 o mayor)')
      return
    }
    if (descuentoNum > pedido.total + TOLERANCIA) {
      toast.error('El descuento no puede ser mayor al subtotal del pedido')
      return
    }

    setEnviando(true)
    try {
      const factura = await crearFactura({
        pedido_id: pedido.id,
        cliente_id: pedido.cliente_id,
        usuario_id: usuarioId,
        subtotal: pedido.total,
        descuento: descuentoNum,
        impuesto: impuestoNum,
      })
      toast.exito(`Factura ${factura.numero_factura} generada`)
      onCreada()
    } catch (e) {
      toast.error(e)
      setEnviando(false)
    }
  }

  return (
    <form className={base.formStack} onSubmit={generar}>
      <p className={base.muted}>
        Este pedido todavía no tiene factura. Genérala para poder registrar el pago.
      </p>

      <details className={base.extras}>
        <summary>Descuento o impuesto (opcional)</summary>
        <div className={base.formRow} style={{ marginTop: 10 }}>
          <label className={base.field}>
            <span>Descuento (Bs)</span>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={descuento}
              onChange={(e) => setDescuento(e.target.value)}
            />
          </label>
          <label className={base.field}>
            <span>Impuesto (Bs)</span>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={impuesto}
              onChange={(e) => setImpuesto(e.target.value)}
            />
          </label>
        </div>
      </details>

      <div className={base.formRow}>
        <button className={base.primary} type="submit" disabled={enviando || !valido}>
          {enviando ? 'Generando…' : 'Generar factura'}
        </button>
        <span className={base.muted}>
          Total a cobrar: <strong>{total === null ? '—' : formatearMonto(total)}</strong>
        </span>
      </div>
    </form>
  )
}