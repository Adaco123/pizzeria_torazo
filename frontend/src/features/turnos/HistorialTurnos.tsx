import type { Turno } from '../../api.ts'
import { formatearFecha, formatearMonto } from '../../utils/formato.ts'
import styles from './Turnos.module.css'

interface Props {
  turnos: Turno[]
  /** Muestra la columna "Usuario" (para el administrador). */
  mostrarUsuario: boolean
  /** El administrador ve el resumen también con el turno abierto. */
  esAdmin: boolean
  nombres: Record<number, string>
  usuarioId: number | undefined
  /** Resumen del turno: el cajero lo ve solo de sus turnos ya cerrados. */
  onResumen?: (turnoId: number) => void
  onPedidos?: (turnoId: number) => void
  onCompletar: (turnoId: number) => void
}

export function HistorialTurnos({
  turnos,
  mostrarUsuario,
  esAdmin,
  nombres,
  usuarioId,
  onResumen,
  onPedidos,
  onCompletar,
}: Props) {
  if (turnos.length === 0) return <p className={styles.muted}>Todavía no hay turnos.</p>

  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>#</th>
            {mostrarUsuario && <th>Usuario</th>}
            <th>Apertura</th>
            <th>Cierre</th>
            <th>Monto inicial</th>
            <th>Monto de cierre</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {turnos.map((turno) => {
            const sinMontoCierre = !turno.abierto && turno.monto_cierre === null
            const esMio = turno.usuario_id === usuarioId
            return (
              <tr key={turno.id}>
                <td>{turno.id}</td>
                {mostrarUsuario && (
                  <td>
                    {nombres[turno.usuario_id] ?? `Usuario #${turno.usuario_id}`}
                    {esMio ? ' (tú)' : ''}
                  </td>
                )}
                <td>{formatearFecha(turno.apertura)}</td>
                <td>{formatearFecha(turno.cierre)}</td>
                <td>{formatearMonto(turno.monto_inicio)}</td>
                <td>{sinMontoCierre ? 'Pendiente' : formatearMonto(turno.monto_cierre)}</td>
                <td>
                  <span className={turno.abierto ? styles.badgeOpen : styles.badgeClosed}>
                    {turno.abierto ? 'Abierto' : 'Cerrado'}
                  </span>
                </td>
                <td className={styles.actions}>
                  {onResumen && (esAdmin || !turno.abierto) && (
                    <button
                      className={styles.link}
                      type="button"
                      onClick={() => onResumen(turno.id)}
                    >
                      {esAdmin ? 'Resumen' : 'Cuadre'}
                    </button>
                  )}
                  {onPedidos && (
                    <button
                      className={styles.link}
                      type="button"
                      onClick={() => onPedidos(turno.id)}
                    >
                      Pedidos
                    </button>
                  )}
                  {sinMontoCierre && (
                    <button
                      className={styles.link}
                      type="button"
                      onClick={() => onCompletar(turno.id)}
                    >
                      Registrar monto
                    </button>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}