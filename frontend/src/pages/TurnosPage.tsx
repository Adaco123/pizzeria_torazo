import { CalendarDays, ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../auth/auth-context.ts'
import { Cabeza } from '../features/admin/ui.tsx'
import ui from '../features/admin/Ui.module.css'
import { CompletarCierreForm } from '../features/turnos/CompletarCierreForm.tsx'
import { DetalleTurno } from '../features/turnos/DetalleTurno.tsx'
import { HistorialTurnos } from '../features/turnos/HistorialTurnos.tsx'
import { MiTurnoPanel } from '../features/turnos/MiTurnoPanel.tsx'
import { PedidosDelTurno } from '../features/turnos/PedidosDelTurno.tsx'
import { ResumenTicket } from '../features/turnos/ResumenTicket.tsx'
import styles from '../features/turnos/Turnos.module.css'
import { useNombresUsuarios, useTurnos, useTurnosAbiertos } from '../features/turnos/useTurnos.ts'
import { useResumenTurno } from '../features/turnos/useResumenTurno.ts'
import base from '../features/pedidos/Pedidos.module.css'

/** Caja del día. Mismo esquema que Pedidos: «Mi turno» · lista de turnos · resumen (ticket). */
export function TurnosPage() {
  const { sesion, hasRole } = useAuth()
  const esAdmin = hasRole('Administrador')
  // El cajero pide solo sus turnos; el administrador, todos, de a 20 con «Ver más».
  const historial = useTurnos(esAdmin ? undefined : sesion?.id)
  const abiertos = useTurnosAbiertos()
  const { turnos, cargando, error, hayMas, cargandoMas, verMas } = historial
  function recargar(): void {
    historial.recargar()
    abiertos.recargar()
  }
  const nombres = useNombresUsuarios(esAdmin)

  const [resumenId, setResumenId] = useState<number | null>(null)
  const [pedidosId, setPedidosId] = useState<number | null>(null)
  const [completandoId, setCompletandoId] = useState<number | null>(null)
  const { resumen, error: errorResumen } = useResumenTurno(resumenId)

  // El cajero solo ve sus turnos; el administrador ve todos.
  const visibles = esAdmin ? turnos : turnos.filter((t) => t.usuario_id === sesion?.id)
  const miTurno = abiertos.turnos.find((t) => t.usuario_id === sesion?.id) ?? null
  const turnoACompletar = turnos.find((t) => t.id === completandoId) ?? null
  const listo = !cargando && !error

  return (
    <section className={`${base.page} ${base.pageAncha}`}>
      <div className={styles.barra}>
        <h1 className={styles.titulo}>Turnos</h1>
        {listo && (
          <>
            <span className={styles.pildora}>
              {miTurno ? (
                <>
                  Turno <b>#{miTurno.id}</b> abierto
                </>
              ) : (
                'Sin turno abierto'
              )}
            </span>
            <span className={styles.pildora}>
              <b>{visibles.length}{hayMas ? '+' : ''}</b> {esAdmin ? 'turnos' : 'mis turnos'}
            </span>
          </>
        )}
      </div>

      <div className={styles.layout}>
        {listo && sesion ? (
          <MiTurnoPanel
            turno={miTurno}
            usuarioId={sesion.id}
            onCambio={recargar}
            onVerResumen={setResumenId}
            puedeVerResumenAbierto={esAdmin}
            enRiel
          />
        ) : (
          <aside className={styles.riel} aria-label="Mi turno">
            <h2>Mi turno</h2>
            {cargando && <p className={styles.muted}>Cargando turnos…</p>}
          </aside>
        )}

        <div className={styles.centro}>
          {error && (
            <div className={styles.errorRow}>
              <p className={styles.error} role="alert">
                {error}
              </p>
              <button className={`${ui.btn} ${ui.secundario}`} type="button" onClick={recargar}>
                Reintentar
              </button>
            </div>
          )}

          {pedidosId !== null && (
            <PedidosDelTurno key={pedidosId} turnoId={pedidosId} onCerrar={() => setPedidosId(null)} />
          )}

          {turnoACompletar && (
            <CompletarCierreForm
              key={turnoACompletar.id}
              turno={turnoACompletar}
              onListo={() => {
                setCompletandoId(null)
                recargar()
              }}
              onCancelar={() => setCompletandoId(null)}
            />
          )}

          {listo && (
            <section className={styles.card}>
              <Cabeza icono={CalendarDays} titulo={esAdmin ? 'Todos los turnos' : 'Mis turnos'} cuenta={visibles.length} />
              <HistorialTurnos
                turnos={visibles}
                mostrarUsuario={esAdmin}
                esAdmin={esAdmin}
                nombres={nombres}
                usuarioId={sesion?.id}
                elegidoId={resumenId}
                onResumen={setResumenId}
                onPedidos={setPedidosId}
                onCompletar={setCompletandoId}
              />
              {hayMas && (
                <button
                  className={`${ui.btn} ${ui.secundario} ${styles.verMas}`}
                  type="button"
                  disabled={cargandoMas}
                  onClick={() => void verMas()}
                >
                  <ChevronDown size={16} aria-hidden="true" /> {cargandoMas ? 'Cargando…' : 'Ver más turnos'}
                </button>
              )}
            </section>
          )}

          {esAdmin && resumen && <DetalleTurno resumen={resumen} />}
        </div>

        <ResumenTicket
          key={resumenId ?? 'ninguno'}
          turnoId={resumenId}
          resumen={resumen}
          error={errorResumen}
          onCerrar={() => setResumenId(null)}
        />
      </div>
    </section>
  )
}
