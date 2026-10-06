import { useState } from 'react'
import { useAuth } from '../auth/auth-context.ts'
import { CompletarCierreForm } from '../features/turnos/CompletarCierreForm.tsx'
import { HistorialTurnos } from '../features/turnos/HistorialTurnos.tsx'
import { MiTurnoPanel } from '../features/turnos/MiTurnoPanel.tsx'
import { ResumenTurnoPanel } from '../features/turnos/ResumenTurnoPanel.tsx'
import styles from '../features/turnos/Turnos.module.css'
import { useNombresUsuarios, useTurnos } from '../features/turnos/useTurnos.ts'

export function TurnosPage() {
  const { sesion, hasRole } = useAuth()
  const esAdmin = hasRole('Administrador')
  const { turnos, cargando, error, recargar } = useTurnos()
  const nombres = useNombresUsuarios(esAdmin)

  const [resumenId, setResumenId] = useState<number | null>(null)
  const [completandoId, setCompletandoId] = useState<number | null>(null)

  // El cajero solo ve sus turnos; el administrador ve todos.
  const visibles = esAdmin ? turnos : turnos.filter((t) => t.usuario_id === sesion?.id)
  const miTurno = turnos.find((t) => t.abierto && t.usuario_id === sesion?.id) ?? null
  const turnoACompletar = turnos.find((t) => t.id === completandoId) ?? null

  return (
    <section className={styles.page}>
      <h1>Turnos</h1>

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

      {cargando && <p className={styles.muted}>Cargando turnos…</p>}

      {!cargando && !error && sesion && (
        <MiTurnoPanel
          turno={miTurno}
          usuarioId={sesion.id}
          onCambio={recargar}
          onVerResumen={esAdmin ? setResumenId : undefined}
        />
      )}

      {esAdmin && resumenId !== null && (
        <ResumenTurnoPanel
          key={resumenId}
          turnoId={resumenId}
          onCerrar={() => setResumenId(null)}
        />
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

      {!cargando && !error && (
        <section className={styles.card}>
          <h2>{esAdmin ? 'Todos los turnos' : 'Mis turnos'}</h2>
          <HistorialTurnos
            turnos={visibles}
            mostrarUsuario={esAdmin}
            nombres={nombres}
            usuarioId={sesion?.id}
            onResumen={esAdmin ? setResumenId : undefined}
            onCompletar={setCompletandoId}
          />
        </section>
      )}
    </section>
  )
}