import { useEffect, useState } from 'react'
import { useAuth } from '../../auth/auth-context.ts'
import { BarraCaja } from '../caja/barra/BarraCaja.tsx'
import { Hoja } from '../caja/Hoja.tsx'
import { INTERVALO_MS } from '../cocina/useCocina.ts'
import { estadoDe } from '../pedidos/estados.ts'
import { usePedidos } from '../pedidos/usePedidos.ts'
import { ResumenTurnoPanel } from '../turnos/ResumenTurnoPanel.tsx'
import { useTurnosAbiertos } from '../turnos/useTurnos.ts'

/**
 * La barra de caja de Pedidos (gastos, agotados, stock, cierre) dentro de Mesas, con su misma regla:
 * aparece cuando el cajero o el administrador tienen un turno abierto.
 */
export function BarraCajaMesas() {
  const { sesion, hasRole } = useAuth()
  const esAdmin = hasRole('Administrador')
  const turnos = useTurnosAbiertos()
  const { pedidos, recargar } = usePedidos()
  const [resumenId, setResumenId] = useState<number | null>(null)

  const miTurno = turnos.turnos.find((t) => t.abierto && t.usuario_id === sesion?.id) ?? null
  const turnosAbiertos = new Set(turnos.turnos.filter((t) => t.abierto).map((t) => t.id))
  const delAlcance = esAdmin
    ? pedidos.filter((p) => turnosAbiertos.has(p.turno_id))
    : pedidos.filter((p) => miTurno !== null && p.turno_id === miTurno.id)
  const sinEntregar = delAlcance.filter((p) => ['confirmado', 'en_preparacion', 'listo'].includes(estadoDe(p) ?? '')).length

  // Solo sirve para avisar al cerrar el turno cuántos pedidos faltan por entregar.
  useEffect(() => {
    if (miTurno === null) return
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') recargar()
    }, INTERVALO_MS)
    return () => window.clearInterval(id)
  }, [miTurno, recargar])

  if (!miTurno) return null

  return (
    <>
      <BarraCaja
        turno={miTurno}
        esAdmin={esAdmin}
        version={pedidos.length}
        sinEntregar={sinEntregar}
        onCambio={turnos.recargar}
        onVerResumen={setResumenId}
      />
      {resumenId !== null && (
        <Hoja titulo="Resumen del turno" onCerrar={() => setResumenId(null)}>
          <ResumenTurnoPanel key={resumenId} turnoId={resumenId} completo={esAdmin} onCerrar={() => setResumenId(null)} />
        </Hoja>
      )}
    </>
  )
}
