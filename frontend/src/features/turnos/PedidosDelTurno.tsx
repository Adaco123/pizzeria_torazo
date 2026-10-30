import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { pedidosApi } from '../../apis/pedidos.ts'
import type { Pedido } from '../../apis/pedidos.ts'
import { useToast } from '../../toast/toast-context.ts'
import { descargarBlob } from '../../utils/archivos.ts'
import { esAbort, formatearFecha, formatearMonto, mensajeDeError } from '../../utils/formato.ts'
import { EstadoBadge } from '../pedidos/EstadoBadge.tsx'
import { estadoDe } from '../pedidos/estados.ts'
import { useClientes } from '../pedidos/usePedidos.ts'
import styles from './Turnos.module.css'

interface Props {
  turnoId: number
  onCerrar: () => void
}

/** Pedidos cobrados de un turno, para buscar una ficha de otro día (reclamos, facturas, tickets). */
export function PedidosDelTurno({ turnoId, onCerrar }: Props) {
  const toast = useToast()
  const { clientes } = useClientes()
  const [pedidos, setPedidos] = useState<Pedido[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [ocupadoId, setOcupadoId] = useState<number | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    pedidosApi
      .listarDelTurno(turnoId, { signal: controller.signal })
      .then(setPedidos)
      .catch((e: unknown) => {
        if (!esAbort(e)) setError(mensajeDeError(e))
      })
    return () => controller.abort()
  }, [turnoId])

  const nombres = Object.fromEntries(clientes.map((c) => [c.id, c.nombre]))
  const texto = busqueda.trim().toLowerCase().replace(/^n?°?\s*#?/, '')

  // Los borradores no tienen ficha ni se cobraron: no son parte del historial.
  const visibles = (pedidos ?? [])
    .filter((p) => p.numero_turno !== null)
    .filter(
      (p) =>
        texto === '' ||
        String(p.numero_turno) === texto ||
        (nombres[p.cliente_id] ?? '').toLowerCase().includes(texto),
    )
    .toSorted((a, b) => (b.numero_turno ?? 0) - (a.numero_turno ?? 0))

  async function ticket(pedido: Pedido) {
    setOcupadoId(pedido.id)
    try {
      descargarBlob(await pedidosApi.ticketCliente(pedido.id), `ticket-${pedido.numero_turno}.pdf`)
    } catch (e) {
      toast.error(e)
    } finally {
      setOcupadoId(null)
    }
  }

  return (
    <section className={styles.card}>
      <div className={styles.cardHeader}>
        <h2>Pedidos del turno #{turnoId}</h2>
        <button className={styles.secondary} type="button" onClick={onCerrar}>
          Cerrar lista
        </button>
      </div>

      <label className={styles.field}>
        <span>Buscar por ficha o cliente</span>
        <input
          type="search"
          inputMode="search"
          placeholder="Ej.: 12"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
      </label>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      {!pedidos && !error && <p className={styles.muted}>Cargando pedidos…</p>}
      {pedidos && visibles.length === 0 && <p className={styles.muted}>No hay pedidos que coincidan.</p>}

      {visibles.length > 0 && (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Ficha</th>
                <th>Hora</th>
                <th>Cliente</th>
                <th>Entrega</th>
                <th>Estado</th>
                <th>Total</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((pedido) => {
                const cancelado = estadoDe(pedido) === 'cancelado'
                return (
                  <tr key={pedido.id}>
                    <td>
                      <strong>{pedido.numero_turno}</strong>
                    </td>
                    <td>{formatearFecha(pedido.fecha)}</td>
                    <td>{nombres[pedido.cliente_id] ?? `Cliente #${pedido.cliente_id}`}</td>
                    <td>{pedido.tipo_entrega?.nombre ?? '—'}</td>
                    <td>
                      <EstadoBadge estado={estadoDe(pedido)} />
                    </td>
                    <td>{formatearMonto(pedido.total)}</td>
                    <td className={styles.actions}>
                      <Link to={`/pedidos/${pedido.id}`}>Abrir</Link>
                      {!cancelado && (
                        <button
                          className={styles.link}
                          type="button"
                          disabled={ocupadoId === pedido.id}
                          onClick={() => void ticket(pedido)}
                        >
                          Ticket
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
