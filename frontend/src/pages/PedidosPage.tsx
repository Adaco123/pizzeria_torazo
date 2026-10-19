import { useEffect } from 'react'
import { Link } from 'react-router'
import { useAuth } from '../auth/auth-context.ts'
import { Caja } from '../features/caja/Caja.tsx'
import { INTERVALO_MS } from '../features/cocina/useCocina.ts'
import { TableroPedidos } from '../features/pedidos/TableroPedidos.tsx'
import styles from '../features/pedidos/Pedidos.module.css'
import { useClientes, usePedidos } from '../features/pedidos/usePedidos.ts'
import { MiTurnoPanel } from '../features/turnos/MiTurnoPanel.tsx'
import { useTurnos } from '../features/turnos/useTurnos.ts'

export function PedidosPage() {
  const { sesion, hasRole } = useAuth()
  const esAdmin = hasRole('Administrador')

  const turnos = useTurnos()
  const { pedidos, cargando, error, recargar } = usePedidos()
  const { clientes, recargar: recargarClientes } = useClientes()

  const miTurno = turnos.turnos.find((t) => t.abierto && t.usuario_id === sesion?.id) ?? null
  const sinTurno = !turnos.cargando && !turnos.error && miTurno === null

  const nombres = Object.fromEntries(clientes.map((c) => [c.id, c.nombre]))

  // El cajero ve los pedidos de su turno abierto; el administrador, los de todos los turnos abiertos.
  const turnosAbiertos = new Set(turnos.turnos.filter((t) => t.abierto).map((t) => t.id))
  const delAlcance = esAdmin
    ? pedidos.filter((p) => turnosAbiertos.has(p.turno_id))
    : pedidos.filter((p) => miTurno !== null && p.turno_id === miTurno.id)

  // El tablero se actualiza solo (cocina cambia los estados) mientras la pestaña esté visible.
  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') recargar()
    }, INTERVALO_MS)
    return () => window.clearInterval(id)
  }, [recargar])

  function alCambiar() {
    recargar()
    recargarClientes()
  }

  return (
    <section className={styles.page}>
      <div className={styles.headerRow}>
        <h1>Pedidos</h1>
      </div>

      {turnos.error && (
        <p className={styles.error} role="alert">
          {turnos.error}
        </p>
      )}

      {/* Sin turno no se puede vender: el cajero lo abre aquí mismo, sin salir de la pantalla. */}
      {sinTurno && !esAdmin && sesion && (
        <MiTurnoPanel turno={null} usuarioId={sesion.id} onCambio={turnos.recargar} />
      )}
      {sinTurno && esAdmin && (
        <div className={styles.aviso}>
          <p>Necesitas un turno abierto para registrar ventas.</p>
          <Link to="/turnos">Ir a Turnos</Link>
        </div>
      )}

      {miTurno && sesion && <Caja usuarioId={sesion.id} turnoId={miTurno.id} onCambio={alCambiar} />}

      {error && (
        <div className={styles.errorRow}>
          <p className={styles.error} role="alert">
            {error}
          </p>
          <button className={styles.secondary} type="button" onClick={recargar}>
            Reintentar
          </button>
        </div>
      )}
      {cargando && <p className={styles.muted}>Cargando pedidos…</p>}
      {!cargando && (miTurno !== null || esAdmin) && (
        <TableroPedidos pedidos={delAlcance} nombres={nombres} onCambio={alCambiar} />
      )}
    </section>
  )
}
