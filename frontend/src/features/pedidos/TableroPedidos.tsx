import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { pedidosApi } from '../../api.ts'
import type { Pedido } from '../../api.ts'
import { useToast } from '../../toast/toast-context.ts'
import { descargarBlob } from '../../utils/archivos.ts'
import { formatearMonto } from '../../utils/formato.ts'
import { BotonSonido } from '../cocina/BotonSonido.tsx'
import {
  minutosDesde,
  minutosParaPromesa,
  textoHoraPrometida,
  textoPromesa,
  textoTiempo,
} from '../cocina/tiempo.ts'
import { useAhora } from '../cocina/useCocina.ts'
import { useAvisoSonoro } from '../cocina/useSonido.ts'
import { estadoDe } from './estados.ts'
import styles from './Tablero.module.css'

type Columna = 'cocina' | 'listo' | 'entregado'
type FiltroEntrega = 'todos' | 'Local' | 'Domicilio'

/** Cuántos pedidos entregados se muestran: los más recientes, para no llenar la pantalla. */
const MAX_ENTREGADOS = 12

// En el teléfono "Listo" va primero: es lo que el cajero tiene que atender.
const COLUMNAS: { id: Columna; titulo: string }[] = [
  { id: 'listo', titulo: 'Listo para entregar' },
  { id: 'cocina', titulo: 'En cocina' },
  { id: 'entregado', titulo: 'Entregado' },
]

function columnaDe(pedido: Pedido): Columna | null {
  switch (estadoDe(pedido)) {
    case 'confirmado':
    case 'en_preparacion':
      return 'cocina'
    case 'listo':
      return 'listo'
    case 'entregado':
      return 'entregado'
    default:
      return null // pendiente (borrador) y cancelado no van al tablero
  }
}

interface Props {
  pedidos: Pedido[]
  /** cliente_id → nombre */
  nombres: Record<number, string>
  onCambio: () => void
}

export function TableroPedidos({ pedidos, nombres, onCambio }: Props) {
  const toast = useToast()
  const ahora = useAhora()
  const [filtro, setFiltro] = useState<FiltroEntrega>('todos')
  const [ocupadoId, setOcupadoId] = useState<number | null>(null)

  // Suena cuando cocina deja un pedido listo para entregar.
  const idsListos = useMemo(
    () => pedidos.filter((p) => estadoDe(p) === 'listo').map((p) => p.id),
    [pedidos],
  )
  const sonido = useAvisoSonoro(idsListos)

  async function entregar(pedido: Pedido) {
    setOcupadoId(pedido.id)
    try {
      // Otro usuario pudo cancelarlo mientras tanto: se confirma el estado antes de entregar.
      const actual = await pedidosApi.obtener(pedido.id)
      if (estadoDe(actual) !== 'listo') {
        toast.error(`El pedido N° ${pedido.numero_turno} cambió de estado. Se actualizó el tablero.`)
        return
      }
      await pedidosApi.cambiarEstado(pedido.id, 'entregado')
      toast.exito(`Pedido N° ${pedido.numero_turno} entregado`)
    } catch (e) {
      toast.error(e)
    } finally {
      setOcupadoId(null)
      onCambio()
    }
  }

  async function reimprimir(pedido: Pedido) {
    setOcupadoId(pedido.id)
    try {
      descargarBlob(await pedidosApi.ticketCliente(pedido.id), `ticket-${pedido.numero_turno}.pdf`)
    } catch (e) {
      toast.error(e)
    } finally {
      setOcupadoId(null)
    }
  }

  const visibles = pedidos.filter(
    (p) => columnaDe(p) !== null && (filtro === 'todos' || p.tipo_entrega?.nombre === filtro),
  )
  const de = (columna: Columna) => {
    const lista = visibles.filter((p) => columnaDe(p) === columna)
    // En espera: el más antiguo primero. Entregados: el más reciente primero.
    return columna === 'entregado'
      ? lista.toSorted((a, b) => b.updated_at.localeCompare(a.updated_at)).slice(0, MAX_ENTREGADOS)
      : lista.toSorted((a, b) => a.fecha.localeCompare(b.fecha) || a.id - b.id)
  }

  return (
    <section className={styles.tablero} aria-label="Tablero de pedidos">
      <div className={styles.cabecera}>
        <h2>Pedidos</h2>
        <BotonSonido activo={sonido.activo} onAlternar={sonido.alternar} />
        <div className={styles.filtros} role="group" aria-label="Tipo de entrega">
          {(['todos', 'Local', 'Domicilio'] as const).map((f) => (
            <button
              key={f}
              type="button"
              className={filtro === f ? `${styles.filtro} ${styles.filtroActivo}` : styles.filtro}
              aria-pressed={filtro === f}
              onClick={() => setFiltro(f)}
            >
              {f === 'todos' ? 'Todos' : f}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.columnas}>
        {COLUMNAS.map(({ id, titulo }) => {
          const lista = de(id)
          return (
            <section key={id} className={styles.columna} aria-label={titulo}>
              <h3 className={styles.columnaTitulo}>
                {titulo}
                <span className={id === 'listo' && lista.length > 0 ? styles.contadorListo : styles.contador}>
                  {lista.length}
                </span>
              </h3>
              {lista.length === 0 && <p className={styles.vacia}>Sin pedidos</p>}
              {lista.map((pedido) => {
                const minutos = minutosDesde(pedido.fecha, ahora)
                return (
                  <article
                    key={pedido.id}
                    className={id === 'listo' ? `${styles.tarjeta} ${styles.tarjetaListo}` : styles.tarjeta}
                  >
                    <header className={styles.tarjetaCabecera}>
                      <span className={styles.ficha}>N° {pedido.numero_turno ?? '—'}</span>
                      <span className={styles.tipo}>{pedido.tipo_entrega?.nombre ?? '—'}</span>
                    </header>
                    <p className={styles.cliente}>{nombres[pedido.cliente_id] ?? `Cliente #${pedido.cliente_id}`}</p>
                    {pedido.tipo_entrega?.nombre === 'Domicilio' && pedido.direccion_entrega && (
                      <p className={styles.direccion}>{pedido.direccion_entrega}</p>
                    )}
                    <div className={styles.fila}>
                      <strong>{formatearMonto(pedido.total)}</strong>
                      {pedido.pagado >= pedido.total && pedido.total > 0 ? (
                        <span className={styles.pagado}>Pagado</span>
                      ) : (
                        <span className={styles.impago}>Sin cobrar</span>
                      )}
                    </div>
                    {id !== 'entregado' && (
                      <p className={styles.tiempo}>
                        {textoTiempo(minutos)}
                        {pedido.hora_prometida && (
                          <>
                            {' · '}
                            <span
                              className={
                                id === 'cocina' && minutosParaPromesa(pedido.hora_prometida, ahora) < 0
                                  ? styles.atrasado
                                  : undefined
                              }
                            >
                              {textoHoraPrometida(pedido.hora_prometida)}
                              {id === 'cocina' &&
                                ` (${textoPromesa(minutosParaPromesa(pedido.hora_prometida, ahora)).toLowerCase()})`}
                            </span>
                          </>
                        )}
                      </p>
                    )}
                    <div className={styles.acciones}>
                      {id === 'listo' && (
                        <button
                          className={styles.entregar}
                          type="button"
                          disabled={ocupadoId === pedido.id}
                          onClick={() => void entregar(pedido)}
                        >
                          {ocupadoId === pedido.id ? 'Entregando…' : 'Entregar'}
                        </button>
                      )}
                      <button
                        className={styles.ver}
                        type="button"
                        disabled={ocupadoId === pedido.id}
                        onClick={() => void reimprimir(pedido)}
                      >
                        Ticket
                      </button>
                      <Link className={styles.ver} to={`/pedidos/${pedido.id}`}>
                        Ver
                      </Link>
                    </div>
                  </article>
                )
              })}
            </section>
          )
        })}
      </div>
    </section>
  )
}
