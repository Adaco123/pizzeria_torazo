import { Banknote, CalendarDays, FileText, Receipt } from 'lucide-react'
import type { Turno } from '../../apis/turnos.ts'
import { formatearFecha, formatearMonto } from '../../utils/formato.ts'
import { Acciones, BotonIcono, Vacio } from '../admin/ui.tsx'
import ui from '../admin/Ui.module.css'
import styles from './Turnos.module.css'

interface Props {
  turnos: Turno[]
  /** Muestra quién abrió cada turno (para el administrador). */
  mostrarUsuario: boolean
  /** El administrador ve el resumen también con el turno abierto. */
  esAdmin: boolean
  nombres: Record<number, string>
  usuarioId: number | undefined
  /** Turno cuyo resumen está abierto en el ticket. */
  elegidoId?: number | null
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
  elegidoId,
  onResumen,
  onPedidos,
  onCompletar,
}: Props) {
  if (turnos.length === 0) {
    return <Vacio icono={CalendarDays} titulo="Todavía no hay turnos" detalle="Abre tu primer turno desde «Mi turno»." />
  }

  return (
    <ul className={styles.lista}>
      {turnos.map((turno) => {
        const sinMontoCierre = !turno.abierto && turno.monto_cierre === null
        const esMio = turno.usuario_id === usuarioId
        const puedeResumen = onResumen !== undefined && (esAdmin || !turno.abierto)
        const clase = [
          styles.fila,
          turno.abierto ? '' : sinMontoCierre ? styles.filaPendiente : styles.filaCerrada,
          elegidoId === turno.id ? styles.filaElegida : '',
        ].join(' ')
        const contenido = (
          <>
            <span className={styles.numero}>#{turno.id}</span>
            <span className={styles.datos}>
              <b>
                {mostrarUsuario ? (nombres[turno.usuario_id] ?? `Usuario #${turno.usuario_id}`) : `Turno #${turno.id}`}
                {mostrarUsuario && esMio && <span className={ui.cuenta}> tú</span>}
              </b>
              <small>
                {formatearFecha(turno.apertura)} → {turno.cierre ? formatearFecha(turno.cierre) : 'abierto'}
              </small>
            </span>
            <span className={styles.monto}>
              <small>Inicio {formatearMonto(turno.monto_inicio)}</small>
              <b>{turno.abierto ? '—' : sinMontoCierre ? 'Pendiente' : formatearMonto(turno.monto_cierre)}</b>
            </span>
            <span
              className={`${ui.estado} ${turno.abierto ? ui.estadoOn : sinMontoCierre ? styles.pendiente : ui.estadoOff}`}
            >
              {turno.abierto ? 'Abierto' : sinMontoCierre ? 'Falta monto' : 'Cerrado'}
            </span>
          </>
        )
        return (
          <li key={turno.id} className={clase}>
            {puedeResumen ? (
              <button
                type="button"
                className={styles.filaCuerpo}
                aria-pressed={elegidoId === turno.id}
                title={esAdmin ? 'Ver el resumen' : 'Ver el cuadre'}
                onClick={() => onResumen(turno.id)}
              >
                {contenido}
              </button>
            ) : (
              <div className={styles.filaCuerpo}>{contenido}</div>
            )}
            <Acciones>
              {puedeResumen && (
                <BotonIcono
                  icono={FileText}
                  titulo={esAdmin ? `Resumen del turno #${turno.id}` : `Cuadre del turno #${turno.id}`}
                  onClick={() => onResumen(turno.id)}
                />
              )}
              {onPedidos && <BotonIcono icono={Receipt} titulo={`Pedidos del turno #${turno.id}`} onClick={() => onPedidos(turno.id)} />}
              {sinMontoCierre && (
                <BotonIcono
                  icono={Banknote}
                  titulo={`Registrar el monto de cierre del turno #${turno.id}`}
                  tono="ok"
                  onClick={() => onCompletar(turno.id)}
                />
              )}
            </Acciones>
          </li>
        )
      })}
    </ul>
  )
}
