import { ExternalLink, Printer, Receipt, X } from 'lucide-react'
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
import { Acciones, BotonIcono, Buscador, Cabeza, Vacio } from '../admin/ui.tsx'
import ui from '../admin/Ui.module.css'
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
      <Cabeza icono={Receipt} titulo={`Pedidos del turno #${turnoId}`} cuenta={pedidos ? pedidos.filter((p) => p.numero_turno !== null).length : undefined}>
        <button className={`${ui.btn} ${ui.secundario}`} type="button" onClick={onCerrar}>
          <X size={16} aria-hidden="true" /> Cerrar lista
        </button>
      </Cabeza>

      <div className={ui.herramientas}>
        <Buscador valor={busqueda} onChange={setBusqueda} etiqueta="Buscar por ficha o cliente (ej. 12)" />
      </div>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      {!pedidos && !error && <p className={styles.muted}>Cargando pedidos…</p>}
      {pedidos && visibles.length === 0 && (
        <Vacio icono={Receipt} titulo="No hay pedidos que coincidan" detalle="Prueba con otra ficha o cliente." />
      )}

      {visibles.length > 0 && (
        <div className={ui.tw}>
          <table className={ui.tabla}>
            <thead>
              <tr>
                <th>Ficha</th>
                <th>Hora</th>
                <th>Cliente</th>
                <th>Entrega</th>
                <th>Estado</th>
                <th className={ui.num}>Total</th>
                <th>
                  <span className={ui.soloLector}>Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {visibles.map((pedido) => {
                const cancelado = estadoDe(pedido) === 'cancelado'
                return (
                  <tr key={pedido.id} className={cancelado ? ui.inactiva : undefined}>
                    <td>
                      <b>{pedido.numero_turno}</b>
                    </td>
                    <td>{formatearFecha(pedido.fecha)}</td>
                    <td>{nombres[pedido.cliente_id] ?? `Cliente #${pedido.cliente_id}`}</td>
                    <td>{pedido.tipo_entrega?.nombre ?? '—'}</td>
                    <td>
                      <EstadoBadge estado={estadoDe(pedido)} />
                    </td>
                    <td className={ui.num}>{formatearMonto(pedido.total)}</td>
                    <td className={ui.acciones}>
                      <Acciones>
                        <Link
                          className={ui.ib}
                          to={`/pedidos/${pedido.id}`}
                          title={`Abrir la ficha ${pedido.numero_turno}`}
                          aria-label={`Abrir la ficha ${pedido.numero_turno}`}
                        >
                          <ExternalLink size={16} aria-hidden="true" />
                        </Link>
                        {!cancelado && (
                          <BotonIcono
                            icono={Printer}
                            titulo={`Descargar el ticket de la ficha ${pedido.numero_turno}`}
                            disabled={ocupadoId === pedido.id}
                            onClick={() => void ticket(pedido)}
                          />
                        )}
                      </Acciones>
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
