import { Banknote } from 'lucide-react'
import { useState, type SubmitEvent } from 'react'
import { turnosApi } from '../../apis/turnos.ts'
import type { Turno } from '../../apis/turnos.ts'
import { useToast } from '../../toast/toast-context.ts'
import { formatearFecha, parseMonto } from '../../utils/formato.ts'
import ui from '../admin/Ui.module.css'
import { Cabeza } from '../admin/ui.tsx'
import styles from './Turnos.module.css'

interface Props {
  turno: Turno
  onListo: () => void
  onCancelar: () => void
}

/**
 * Turnos que el sistema cerró solo (1:00 a. m. hora Bolivia) quedan sin monto de cierre.
 * Aquí se registra después.
 */
export function CompletarCierreForm({ turno, onListo, onCancelar }: Props) {
  const toast = useToast()
  const [monto, setMonto] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function guardar(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()

    const valor = parseMonto(monto)
    if (valor === null) {
      toast.error('Ingresa un monto válido (0 o mayor)')
      return
    }

    setEnviando(true)
    try {
      await turnosApi.actualizar(turno.id, { monto_cierre: valor })
      toast.exito(`Monto de cierre del turno #${turno.id} registrado`)
      onListo()
    } catch (e) {
      toast.error(e)
      setEnviando(false)
    }
  }

  return (
    <section className={styles.card}>
      <Cabeza icono={Banknote} titulo={`Registrar monto de cierre del turno #${turno.id}`} />
      <p className={styles.muted}>
        Cerrado automáticamente el {formatearFecha(turno.cierre)}. Falta el monto con el que quedó la
        caja.
      </p>
      <form className={styles.form} onSubmit={guardar}>
        <label className={styles.field}>
          <span>Monto de cierre (Bs)</span>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            required
            autoFocus
          />
        </label>
        <button className={`${ui.btn} ${ui.primario}`} type="submit" disabled={enviando}>
          {enviando ? 'Guardando…' : 'Guardar'}
        </button>
        <button className={`${ui.btn} ${ui.secundario}`} type="button" onClick={onCancelar}>
          Cancelar
        </button>
      </form>
    </section>
  )
}