import { useEffect, useState } from 'react'
import { turnosApi } from '../../apis/turnos.ts'
import type { ResumenTurno } from '../../apis/turnos.ts'
import { esAbort, mensajeDeError } from '../../utils/formato.ts'

/** Resumen del turno elegido (o null si no hay ninguno). Se vuelve a pedir al cambiar de turno. */
export function useResumenTurno(turnoId: number | null) {
  const [estado, setEstado] = useState<{ id: number; resumen: ResumenTurno | null; error: string | null } | null>(null)

  useEffect(() => {
    if (turnoId === null) return
    const controller = new AbortController()
    turnosApi
      .resumen(turnoId, { signal: controller.signal })
      .then((resumen) => setEstado({ id: turnoId, resumen, error: null }))
      .catch((e: unknown) => {
        if (!esAbort(e)) setEstado({ id: turnoId, resumen: null, error: mensajeDeError(e) })
      })
    return () => controller.abort()
  }, [turnoId])

  // Mientras llega el de otro turno no se muestra el anterior.
  const vigente = estado !== null && estado.id === turnoId ? estado : null
  return { resumen: vigente?.resumen ?? null, error: vigente?.error ?? null }
}
