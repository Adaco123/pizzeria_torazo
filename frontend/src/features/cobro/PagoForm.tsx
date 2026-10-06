import { useState, type SubmitEvent } from 'react'
import { pagosApi } from '../../api.ts'
import type { Factura, MetodoPago } from '../../api.ts'
import { useToast } from '../../toast/toast-context.ts'
import { formatearMonto, parseMonto } from '../../utils/formato.ts'
import base from '../pedidos/Pedidos.module.css'
import { redondear, TOLERANCIA } from './facturacion.ts'
import styles from './Cobro.module.css'

interface Props {
  factura: Factura
  /** Lo que falta por cobrar. */
  pendiente: number
  metodos: MetodoPago[]
  usuarioId: number
  onPagado: () => void
}

const esEfectivo = (metodo: MetodoPago | undefined) => metodo?.nombre.toLowerCase() === 'efectivo'

export function PagoForm({ factura, pendiente, metodos, usuarioId, onPagado }: Props) {
  const toast = useToast()
  const [metodoId, setMetodoId] = useState<number | null>(metodos[0]?.id ?? null)
  // Por defecto se cobra todo lo pendiente; se puede bajar para pagos divididos.
  const [monto, setMonto] = useState(pendiente.toFixed(2))
  const [recibido, setRecibido] = useState('')
  const [enviando, setEnviando] = useState(false)

  const metodo = metodos.find((m) => m.id === metodoId)
  const efectivo = esEfectivo(metodo)
  const montoNum = parseMonto(monto)
  const recibidoNum = parseMonto(recibido)
  const vuelto =
    efectivo && montoNum !== null && recibidoNum !== null
      ? redondear(Math.max(0, recibidoNum - montoNum))
      : 0

  async function pagar(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!metodo) return toast.error('Elige un método de pago')
    if (montoNum === null || montoNum <= 0) return toast.error('Ingresa un monto mayor a 0')
    if (montoNum > pendiente + TOLERANCIA) {
      return toast.error(`El monto supera lo que falta por cobrar (${formatearMonto(pendiente)})`)
    }
    if (efectivo && (recibidoNum === null || recibidoNum + TOLERANCIA < montoNum)) {
      return toast.error('El monto recibido no puede ser menor al monto a pagar')
    }

    setEnviando(true)
    try {
      await pagosApi.crear({
        factura_id: factura.id,
        metodo_id: metodo.id,
        monto: montoNum,
        monto_recibido: efectivo ? recibidoNum : null,
        usuario_id: usuarioId,
      })
      toast.exito(
        vuelto > 0
          ? `Pago registrado. Vuelto: ${formatearMonto(vuelto)}`
          : 'Pago registrado',
      )
      onPagado()
    } catch (e) {
      toast.error(e)
      setEnviando(false)
    }
  }

  if (metodos.length === 0) {
    return <p className={base.muted}>No hay métodos de pago configurados.</p>
  }

  return (
    <form className={base.formStack} onSubmit={pagar}>
      <h3>Registrar pago</h3>

      <div className={base.field}>
        <span>Método</span>
        <div className={base.chips}>
          {metodos.map((m) => (
            <button
              key={m.id}
              type="button"
              className={m.id === metodoId ? base.chipActive : base.chip}
              aria-pressed={m.id === metodoId}
              onClick={() => setMetodoId(m.id)}
            >
              {m.nombre}
            </button>
          ))}
        </div>
      </div>

      <div className={base.formRow}>
        <label className={base.field}>
          <span>Monto a pagar (Bs)</span>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
          />
        </label>

        {efectivo && (
          <label className={base.field}>
            <span>
              Monto recibido (Bs)
              <button
                className={base.link}
                type="button"
                onClick={() => setRecibido(montoNum === null ? '' : montoNum.toFixed(2))}
              >
                exacto
              </button>
            </span>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={recibido}
              onChange={(e) => setRecibido(e.target.value)}
            />
          </label>
        )}
      </div>

      {efectivo && (
        <p className={styles.vuelto}>
          Vuelto: <strong>{formatearMonto(vuelto)}</strong>
        </p>
      )}

      <div className={base.formRow}>
        <button className={base.primary} type="submit" disabled={enviando}>
          {enviando ? 'Registrando…' : 'Registrar pago'}
        </button>
      </div>
    </form>
  )
}