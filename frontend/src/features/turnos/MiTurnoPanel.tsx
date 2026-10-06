import { useState, type SubmitEvent } from 'react'
import { isApiError, turnoAbiertoDeError, turnosApi } from '../../api.ts'
import type { Turno } from '../../api.ts'
import { useToast } from '../../toast/toast-context.ts'
import { formatearFecha, formatearMonto, parseMonto } from '../../utils/formato.ts'
import styles from './Turnos.module.css'

interface Props {
  /** Turno abierto del usuario actual, o null si no tiene. */
  turno: Turno | null
  usuarioId: number
  onCambio: () => void
  /** Solo se pasa a quien puede ver resúmenes (administradores). Sin él, no hay botón. */
  onVerResumen?: (turnoId: number) => void
}

export function MiTurnoPanel({ turno, usuarioId, onCambio, onVerResumen }: Props) {
  const toast = useToast()
  const [monto, setMonto] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function abrir(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()

    // Vacío se toma como 0: abrir sin dinero inicial en caja.
    const valor = monto.trim() === '' ? 0 : parseMonto(monto)
    if (valor === null) {
      toast.error('Ingresa un monto válido (0 o mayor)')
      return
    }

    setEnviando(true)
    try {
      await turnosApi.abrir({ usuario_id: usuarioId, monto_inicio: valor })
      setMonto('')
      toast.exito('Turno abierto')
      onCambio()
    } catch (e) {
      // Si el backend dice que ya había un turno abierto, solo refrescamos la pantalla.
      if (isApiError(e) && turnoAbiertoDeError(e)) onCambio()
      else toast.error(e)
    } finally {
      setEnviando(false)
    }
  }

  async function cerrar(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!turno) return

    const valor = parseMonto(monto)
    if (valor === null) {
      toast.error('Ingresa el monto con el que cierras la caja (0 o mayor)')
      return
    }

    setEnviando(true)
    try {
      await turnosApi.cerrar(turno.id, valor)
      setMonto('')
      toast.exito('Turno cerrado')
      onCambio()
      onVerResumen?.(turno.id)
    } catch (e) {
      toast.error(e)
    } finally {
      setEnviando(false)
    }
  }

  if (!turno) {
    return (
      <section className={styles.card}>
        <h2>No tienes un turno abierto</h2>
        <p className={styles.muted}>Abre un turno para poder registrar pedidos.</p>
        <form className={styles.form} onSubmit={abrir}>
          <label className={styles.field}>
            <span>Monto inicial en caja (Bs)</span>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
            />
          </label>
          <button className={styles.primary} type="submit" disabled={enviando}>
            {enviando ? 'Abriendo…' : 'Abrir turno'}
          </button>
        </form>
      </section>
    )
  }

  return (
    <section className={styles.card}>
      <div className={styles.cardHeader}>
        <h2>Turno #{turno.id} abierto</h2>
        <span className={styles.badgeOpen}>Abierto</span>
      </div>
      <p className={styles.muted}>
        Desde {formatearFecha(turno.apertura)} · Monto inicial {formatearMonto(turno.monto_inicio)}
      </p>

      <form className={styles.form} onSubmit={cerrar}>
        <label className={styles.field}>
          <span>Monto de cierre en caja (Bs)</span>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            placeholder="0.00"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            required
          />
        </label>
        <button className={styles.primary} type="submit" disabled={enviando}>
          {enviando ? 'Cerrando…' : 'Cerrar turno'}
        </button>
        {onVerResumen && (
          <button className={styles.secondary} type="button" onClick={() => onVerResumen(turno.id)}>
            Ver resumen
          </button>
        )}
      </form>
    </section>
  )
}