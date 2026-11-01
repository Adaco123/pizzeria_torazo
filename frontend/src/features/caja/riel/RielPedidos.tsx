import { Volume2, VolumeX, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { pedidosApi } from '../../../apis/pedidos.ts'
import type { Pedido } from '../../../apis/pedidos.ts'
import type { Cliente } from '../../../apis/clientes.ts'
import type { Combo } from '../../../apis/combos.ts'
import { useToast } from '../../../toast/toast-context.ts'
import { formatearMonto } from '../../../utils/formato.ts'
import { useAhora } from '../../cocina/useCocina.ts'
import { useAvisoSonoro } from '../../cocina/useSonido.ts'
import { CuentaMesaView } from '../../mesas/CuentaMesaView.tsx'
import { useMesas } from '../../mesas/useMesas.ts'
import { estadoDe } from '../../pedidos/estados.ts'
import { Hoja } from '../Hoja.tsx'
import { DetallePedidoHoja } from './DetallePedidoHoja.tsx'
import { FilaPedido } from './FilaPedido.tsx'
import styles from './Riel.module.css'

type Pestana = 'pedidos' | 'mesas' | 'entregados'

/** Cuántos pedidos entregados se muestran: los más recientes. */
const MAX_ENTREGADOS = 12

interface Props {
  pedidos: Pedido[]
  clientes: Cliente[]
  combos: Combo[]
  usuarioId: number
  esAdmin: boolean
  /** Tablet y celular: el riel es un cajón que se abre desde el botón «Pedidos». */
  abierto: boolean
  onCerrar: () => void
  onCambio: () => void
}

export function RielPedidos({ pedidos, clientes, combos, usuarioId, esAdmin, abierto, onCerrar, onCambio }: Props) {
  const toast = useToast()
  const ahora = useAhora()
  const { mesas, recargar: recargarMesas } = useMesas()
  const [pestana, setPestana] = useState<Pestana>('pedidos')
  const [ocupadoId, setOcupadoId] = useState<number | null>(null)
  const [detalleId, setDetalleId] = useState<number | null>(null)
  const [cuentaId, setCuentaId] = useState<number | null>(null)

  const nombres = useMemo(() => Object.fromEntries(clientes.map((c) => [c.id, c.nombre])), [clientes])

  const enCurso = pedidos
    .filter((p) => ['confirmado', 'en_preparacion', 'listo'].includes(estadoDe(p) ?? ''))
    .toSorted((a, b) => {
      // Primero lo que hay que entregar; luego el más antiguo.
      const la = estadoDe(a) === 'listo' ? 0 : 1
      const lb = estadoDe(b) === 'listo' ? 0 : 1
      return la - lb || a.fecha.localeCompare(b.fecha) || a.id - b.id
    })
  const entregados = pedidos
    .filter((p) => estadoDe(p) === 'entregado')
    .toSorted((a, b) => b.updated_at.localeCompare(a.updated_at))
    .slice(0, MAX_ENTREGADOS)
  const listos = enCurso.filter((p) => estadoDe(p) === 'listo').length
  const cuentas = (mesas ?? []).filter((m) => m.cuenta?.estado === 'abierta')
  const piden = cuentas.filter((m) => m.cuenta?.pidio_cuenta).length

  const idsListos = useMemo(() => pedidos.filter((p) => estadoDe(p) === 'listo').map((p) => p.id), [pedidos])
  // Suena cuando cocina deja un pedido listo para entregar.
  const sonido = useAvisoSonoro(idsListos)

  async function entregar(pedido: Pedido) {
    setOcupadoId(pedido.id)
    try {
      // Otro usuario pudo cancelarlo mientras tanto: se confirma el estado antes de entregar.
      const actual = await pedidosApi.obtener(pedido.id)
      if (estadoDe(actual) !== 'listo') {
        toast.error(`El pedido N° ${pedido.numero_turno} cambió de estado. Se actualizó.`)
      } else {
        await pedidosApi.cambiarEstado(pedido.id, 'entregado')
        toast.exito(`Pedido N° ${pedido.numero_turno} entregado`)
      }
    } catch (e) {
      toast.error(e)
    } finally {
      setOcupadoId(null)
      onCambio()
    }
  }

  const fila = (p: Pedido) => (
    <FilaPedido
      key={p.id}
      pedido={p}
      nombre={nombres[p.cliente_id] ?? `Cliente #${p.cliente_id}`}
      ahora={ahora}
      ocupado={ocupadoId === p.id}
      onAbrir={() => setDetalleId(p.id)}
      onEntregar={() => void entregar(p)}
    />
  )

  const tab = (id: Pestana, texto: string, n: number, alerta: boolean) => (
    <button
      type="button"
      role="tab"
      aria-selected={pestana === id}
      className={`${pestana === id ? styles.tabOn : ''} ${alerta ? styles.tabAlerta : ''}`}
      onClick={() => setPestana(id)}
    >
      {texto} <i>{n}</i>
    </button>
  )

  return (
    <>
      {abierto && <div className={styles.cortina} onClick={onCerrar} aria-hidden="true" />}
      <aside className={abierto ? `${styles.riel} ${styles.abierto}` : styles.riel} aria-label="Pedidos">
        <div className={styles.cabeza}>
          <h2>Pedidos</h2>
          <button
            type="button"
            className={styles.icono}
            aria-pressed={sonido.activo}
            aria-label={sonido.activo ? 'Silenciar aviso de pedido listo' : 'Activar aviso sonoro de pedido listo'}
            title={sonido.activo ? 'Sonido activado' : 'Activar sonido'}
            onClick={sonido.alternar}
          >
            {sonido.activo ? <Volume2 size={18} aria-hidden="true" /> : <VolumeX size={18} aria-hidden="true" />}
          </button>
          <button type="button" className={`${styles.icono} ${styles.cerrar}`} aria-label="Cerrar" onClick={onCerrar}>
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className={styles.tabs} role="tablist">
          {tab('pedidos', 'Pedidos', enCurso.length, listos > 0)}
          {tab('mesas', 'Mesas', cuentas.length, piden > 0)}
          {tab('entregados', 'Entregados', entregados.length, false)}
        </div>

        <div className={styles.lista}>
          {pestana === 'pedidos' && (
            <>
              {enCurso.length === 0 && <p className={styles.vacio}>Sin pedidos en curso</p>}
              {enCurso.map(fila)}
            </>
          )}
          {pestana === 'entregados' && (
            <>
              {entregados.length === 0 && <p className={styles.vacio}>Aún no entregas pedidos</p>}
              {entregados.map(fila)}
            </>
          )}
          {pestana === 'mesas' && (
            <>
              {cuentas.length === 0 && <p className={styles.vacio}>Sin mesas por cobrar</p>}
              {cuentas.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className={m.cuenta?.pidio_cuenta ? `${styles.mesa} ${styles.piden}` : styles.mesa}
                  onClick={() => m.cuenta && setCuentaId(m.cuenta.id)}
                >
                  <span className={styles.numero}>{m.numero}</span>
                  <span className={styles.datos}>
                    <b>Mesa {m.numero}</b>
                    <small>
                      {m.cuenta?.rondas} {m.cuenta?.rondas === 1 ? 'ronda' : 'rondas'}
                      {m.cuenta && m.cuenta.rondas_listas > 0 && ` · ${m.cuenta.rondas_listas} lista(s)`}
                      {' · '}
                      {formatearMonto(m.cuenta?.total ?? 0)}
                    </small>
                  </span>
                  {m.cuenta?.pidio_cuenta && <span className={styles.estado}>Pidió la cuenta</span>}
                </button>
              ))}
            </>
          )}
        </div>
      </aside>

      {detalleId !== null && (
        <DetallePedidoHoja
          pedidoId={detalleId}
          combos={combos}
          clientes={clientes}
          usuarioId={usuarioId}
          esAdmin={esAdmin}
          onCerrar={() => setDetalleId(null)}
          onCambio={onCambio}
        />
      )}
      {cuentaId !== null && (
        <Hoja
          titulo="Cobrar mesa"
          onCerrar={() => {
            setCuentaId(null)
            recargarMesas()
            onCambio()
          }}
        >
          <CuentaMesaView cuentaId={cuentaId} />
        </Hoja>
      )}
    </>
  )
}
