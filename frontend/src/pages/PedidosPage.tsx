import { useState } from 'react'
import { Link } from 'react-router'
import { ESTADOS_PEDIDO } from '../api.ts'
import type { EstadoPedidoNombre } from '../api.ts'
import { useAuth } from '../auth/auth-context.ts'
import { Caja } from '../features/caja/Caja.tsx'
import { ListaPedidos } from '../features/pedidos/ListaPedidos.tsx'
import { estadoDe, ETIQUETA_ESTADO } from '../features/pedidos/estados.ts'
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

  const [filtro, setFiltro] = useState<EstadoPedidoNombre | 'todos'>('todos')

  const miTurno = turnos.turnos.find((t) => t.abierto && t.usuario_id === sesion?.id) ?? null
  const sinTurno = !turnos.cargando && !turnos.error && miTurno === null

  const nombres = Object.fromEntries(clientes.map((c) => [c.id, c.nombre]))

  // El cajero ve los pedidos de su turno abierto; el administrador ve todos.
  const delAlcance = esAdmin
    ? pedidos
    : pedidos.filter((p) => miTurno !== null && p.turno_id === miTurno.id)
  const visibles = delAlcance
    .filter((p) => filtro === 'todos' || estadoDe(p) === filtro)
    .toSorted((a, b) => b.id - a.id)

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

      <section className={styles.card}>
        <div className={styles.headerRow}>
          <h2>{esAdmin ? 'Todos los pedidos' : 'Pedidos de mi turno'}</h2>
          <label className={styles.inline}>
            <span className={styles.muted}>Estado</span>
            <select
              value={filtro}
              onChange={(e) => setFiltro(e.target.value as EstadoPedidoNombre | 'todos')}
            >
              <option value="todos">Todos</option>
              {ESTADOS_PEDIDO.map((estado) => (
                <option key={estado} value={estado}>
                  {ETIQUETA_ESTADO[estado]}
                </option>
              ))}
            </select>
          </label>
        </div>

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
        {!cargando && !error && <ListaPedidos pedidos={visibles} nombres={nombres} />}
      </section>
    </section>
  )
}
