import { Banknote, Clock, FileText, Lock, LockOpen } from 'lucide-react'
import { useState, type SubmitEvent } from 'react'
import { isApiError } from '../../api.ts'
import { turnoAbiertoDeError, turnosApi } from '../../apis/turnos.ts'
import type { Turno } from '../../apis/turnos.ts'
import { useToast } from '../../toast/toast-context.ts'
import { formatearFecha, formatearMonto, parseMonto } from '../../utils/formato.ts'
import ui from '../admin/Ui.module.css'
import styles from './Turnos.module.css'

interface Props {
  /** Turno abierto del usuario actual, o null si no tiene. */
  turno: Turno | null
  usuarioId: number
  onCambio: () => void
  /** Se muestra al cerrar el turno (cuadre de caja). */
  onVerResumen?: (turnoId: number) => void
  /** El administrador puede ver el resumen con el turno abierto; el cajero solo al cerrarlo. */
  puedeVerResumenAbierto?: boolean
  /** true en Turnos (columna izquierda fija); false = tarjeta suelta, como en Pedidos. */
  enRiel?: boolean
}

export function MiTurnoPanel({
  turno,
  usuarioId,
  onCambio,
  onVerResumen,
  puedeVerResumenAbierto = false,
  enRiel = false,
}: Props) {
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
      <aside className={enRiel ? styles.riel : `${styles.card} ${styles.suelta}`} aria-label="Mi turno">
        <h2 className={styles.tituloRiel}>Mi turno</h2>
        <div className={`${styles.mi} ${styles.miSin}`}>
          <b className={styles.miTitulo}>No tienes un turno abierto</b>
          <p className={styles.muted}>Abre un turno para poder registrar pedidos.</p>
        </div>
        <form className={styles.formulario} onSubmit={abrir}>
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
          <button className={styles.grande} type="submit" disabled={enviando}>
            <LockOpen size={18} aria-hidden="true" /> {enviando ? 'Abriendo…' : 'Abrir turno'}
          </button>
        </form>
      </aside>
    )
  }

  return (
    <aside className={enRiel ? styles.riel : `${styles.card} ${styles.suelta}`} aria-label="Mi turno">
      <h2 className={styles.tituloRiel}>Mi turno</h2>
      <div className={styles.mi}>
        <div className={styles.miTitulo}>
          <b>Turno #{turno.id}</b>
          <span className={`${ui.estado} ${ui.estadoOn}`}>Abierto</span>
        </div>
        <div className={styles.meta}>
          <span>
            <Clock size={13} aria-hidden="true" /> Desde {formatearFecha(turno.apertura)}
          </span>
          <span>
            <Banknote size={13} aria-hidden="true" /> Monto inicial {formatearMonto(turno.monto_inicio)}
          </span>
        </div>
      </div>

      <form className={styles.formulario} onSubmit={cerrar}>
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
        <button className={styles.grande} type="submit" disabled={enviando}>
          <Lock size={18} aria-hidden="true" /> {enviando ? 'Cerrando…' : 'Cerrar turno'}
        </button>
        {onVerResumen && puedeVerResumenAbierto && (
          <button className={`${ui.btn} ${ui.secundario} ${styles.ancho}`} type="button" onClick={() => onVerResumen(turno.id)}>
            <FileText size={16} aria-hidden="true" /> Ver resumen
          </button>
        )}
      </form>
    </aside>
  )
}
