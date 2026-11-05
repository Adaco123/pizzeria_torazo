import { DetalleTurno } from './DetalleTurno.tsx'
import { ResumenTicket } from './ResumenTicket.tsx'
import styles from './Turnos.module.css'
import { useResumenTurno } from './useResumenTurno.ts'

interface Props {
  turnoId: number
  onCerrar: () => void
  /** El cajero ve solo el cuadre de su turno; el administrador, el resumen completo. */
  completo?: boolean
}

/** Resumen de un turno que se abre solo (en una hoja): cuadre y, para el administrador, el detalle. */
export function ResumenTurnoPanel({ turnoId, onCerrar, completo = true }: Props) {
  const { resumen, error } = useResumenTurno(turnoId)

  return (
    <div className={styles.apilado}>
      <ResumenTicket turnoId={turnoId} resumen={resumen} error={error} onCerrar={onCerrar} />
      {completo && resumen && <DetalleTurno resumen={resumen} />}
    </div>
  )
}
