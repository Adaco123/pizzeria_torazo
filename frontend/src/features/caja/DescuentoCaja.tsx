import { useState, type SubmitEvent } from 'react'
import { pedidosApi } from '../../api.ts'
import type { Pedido, TipoDescuento } from '../../api.ts'
import { useToast } from '../../toast/toast-context.ts'
import { formatearMonto, parseMonto } from '../../utils/formato.ts'
import base from '../pedidos/Pedidos.module.css'
import styles from './Caja.module.css'

interface Props {
  pedido: Pedido
  ocupado: boolean
  /** Recibe el pedido que devolvió el servidor, ya con el total nuevo. */
  onCambio: (pedido: Pedido) => void
}

/** Descuento sobre los productos del pedido. El cajero llega hasta 10 %; más, el administrador. */
export function DescuentoCaja({ pedido, ocupado, onCambio }: Props) {
  const toast = useToast()
  const [abierto, setAbierto] = useState(false)
  const [tipo, setTipo] = useState<TipoDescuento>('porcentaje')
  const [valor, setValor] = useState('')
  const [motivo, setMotivo] = useState('')
  const [enviando, setEnviando] = useState(false)

  if (pedido.detalles.length === 0) return null

  async function aplicar(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    const numero = parseMonto(valor)
    if (numero === null || numero <= 0) return toast.error('Escribe cuánto es el descuento')
    if (motivo.trim() === '') return toast.error('Escribe el motivo del descuento')
    setEnviando(true)
    try {
      onCambio(await pedidosApi.ponerDescuento(pedido.id, { tipo, valor: numero, motivo: motivo.trim() }))
      setAbierto(false)
      setValor('')
      setMotivo('')
    } catch (e) {
      toast.error(e)
    } finally {
      setEnviando(false)
    }
  }

  async function quitar() {
    setEnviando(true)
    try {
      onCambio(await pedidosApi.quitarDescuento(pedido.id))
    } catch (e) {
      toast.error(e)
    } finally {
      setEnviando(false)
    }
  }

  if (pedido.descuento > 0) {
    return (
      <div className={styles.descuento}>
        <span>
          Descuento{' '}
          {pedido.descuento_tipo === 'porcentaje' ? `${pedido.descuento_valor} %` : ''}
          {' '}· {pedido.descuento_motivo}
        </span>
        <span>
          <strong>-{formatearMonto(pedido.descuento)}</strong>{' '}
          <button className={base.link} type="button" disabled={ocupado || enviando} onClick={quitar}>
            quitar
          </button>
        </span>
      </div>
    )
  }

  if (!abierto) {
    return (
      <button className={base.link} type="button" disabled={ocupado} onClick={() => setAbierto(true)}>
        Dar un descuento
      </button>
    )
  }

  return (
    <form className={base.subCard} onSubmit={aplicar} aria-label="Descuento">
      <div className={base.formRow}>
        <label className={base.field}>
          <span>Tipo</span>
          <select value={tipo} onChange={(e) => setTipo(e.target.value as TipoDescuento)}>
            <option value="porcentaje">Porcentaje (%)</option>
            <option value="monto">Monto (Bs)</option>
          </select>
        </label>
        <label className={base.field}>
          <span>{tipo === 'porcentaje' ? 'Porcentaje' : 'Bs a descontar'}</span>
          <input
            type="text"
            inputMode="decimal"
            value={valor}
            aria-label="Valor del descuento"
            onChange={(e) => setValor(e.target.value)}
          />
        </label>
      </div>
      <label className={base.field}>
        <span>Motivo</span>
        <input
          type="text"
          value={motivo}
          maxLength={200}
          placeholder="Cliente frecuente, error de cocina…"
          onChange={(e) => setMotivo(e.target.value)}
        />
      </label>
      <p className={base.muted}>El cajero puede dar hasta 10 % de los productos. Más lo autoriza el administrador.</p>
      <div className={base.formRow}>
        <button className={base.primary} type="submit" disabled={enviando}>
          {enviando ? 'Aplicando…' : 'Aplicar descuento'}
        </button>
        <button className={base.secondary} type="button" onClick={() => setAbierto(false)}>
          Cancelar
        </button>
      </div>
    </form>
  )
}
