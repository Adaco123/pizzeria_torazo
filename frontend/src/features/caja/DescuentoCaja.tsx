import { Tag } from 'lucide-react'
import { useState, type SubmitEvent } from 'react'
import { pedidosApi } from '../../apis/pedidos.ts'
import type { Pedido, TipoDescuento } from '../../apis/pedidos.ts'
import { useToast } from '../../toast/toast-context.ts'
import { formatearMonto, parseMonto } from '../../utils/formato.ts'
import { Hoja } from './Hoja.tsx'
import styles from './Ticket.module.css'

interface Props {
  pedido: Pedido
  ocupado: boolean
  /** Recibe el pedido que devolvió el servidor, ya con el total nuevo. */
  onCambio: (pedido: Pedido) => void
}

const ATAJOS = [5, 10]

/** Descuento sobre los productos del pedido. El cajero llega hasta 10 %; más, el administrador. */
export function DescuentoCaja({ pedido, ocupado, onCambio }: Props) {
  const toast = useToast()
  const [abierto, setAbierto] = useState(false)
  const [tipo, setTipo] = useState<TipoDescuento>('porcentaje')
  const [valor, setValor] = useState('')
  const [motivo, setMotivo] = useState('')
  const [enviando, setEnviando] = useState(false)

  if (pedido.detalles.length === 0) return null

  const numero = parseMonto(valor)
  const subtotal = pedido.detalles.reduce((s, d) => s + d.subtotal, 0)
  // El cajero llega hasta el 10 % de los productos; se avisa antes de enviar.
  const tope = Math.round(subtotal * 0.1 * 100) / 100
  const pasaDelTope =
    numero !== null && (tipo === 'porcentaje' ? numero > 10 : numero > tope)
  const sePuede = numero !== null && numero > 0 && motivo.trim() !== '' && !pasaDelTope

  async function aplicar(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
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
      <div className={styles.fila + ' ' + styles.descuentoFila}>
        <span>
          Descuento {pedido.descuento_tipo === 'porcentaje' ? `${pedido.descuento_valor} %` : ''} · {pedido.descuento_motivo}
        </span>
        <span>
          -{formatearMonto(pedido.descuento)}
          <button type="button" className={styles.enlace} disabled={ocupado || enviando} onClick={quitar}>
            quitar
          </button>
        </span>
      </div>
    )
  }

  return (
    <>
      <button type="button" className={styles.enlace} disabled={ocupado} onClick={() => setAbierto(true)}>
        <Tag size={14} aria-hidden="true" /> Dar un descuento
      </button>

      {abierto && (
        <Hoja titulo="Descuento" onCerrar={() => setAbierto(false)}>
          <form className={styles.formulario} onSubmit={aplicar}>
            <div className={styles.segmento} role="group" aria-label="Tipo de descuento">
              <button type="button" aria-pressed={tipo === 'porcentaje'} onClick={() => setTipo('porcentaje')}>
                Porcentaje %
              </button>
              <button type="button" aria-pressed={tipo === 'monto'} onClick={() => setTipo('monto')}>
                Monto Bs
              </button>
            </div>

            <label className={styles.campo}>
              <span>{tipo === 'porcentaje' ? 'Porcentaje' : 'Bs a descontar'}</span>
              <input
                type="text"
                inputMode="decimal"
                autoFocus
                value={valor}
                aria-label="Valor del descuento"
                onChange={(e) => setValor(e.target.value)}
              />
            </label>

            {tipo === 'porcentaje' && (
              <div className={styles.atajos}>
                {ATAJOS.map((p) => (
                  <button key={p} type="button" onClick={() => setValor(String(p))}>
                    {p} %
                  </button>
                ))}
              </div>
            )}

            <label className={styles.campo}>
              <span>Motivo (obligatorio)</span>
              <input
                type="text"
                value={motivo}
                maxLength={200}
                placeholder="Cliente frecuente, error de cocina…"
                onChange={(e) => setMotivo(e.target.value)}
              />
            </label>

            <p className={pasaDelTope ? styles.errorTexto : styles.ayuda}>
              {pasaDelTope
                ? `El cajero llega hasta 10 % (${formatearMonto(tope)}). Más lo autoriza el administrador.`
                : 'El cajero puede dar hasta 10 % de los productos. Más lo autoriza el administrador.'}
            </p>

            <button type="submit" className={styles.principal} disabled={enviando || !sePuede}>
              {enviando ? 'Aplicando…' : 'Aplicar descuento'}
            </button>
          </form>
        </Hoja>
      )}
    </>
  )
}
