import { Pizza } from 'lucide-react'
import { useMemo, useState } from 'react'
import { pedidosApi } from '../apis/pedidos.ts'
import type { EstadoPedidoNombre, Pedido } from '../apis/pedidos.ts'
import { BarraCocina } from '../features/cocina/barra/BarraCocina.tsx'
import styles from '../features/cocina/Cocina.module.css'
import { PedidoFoco } from '../features/cocina/foco/PedidoFoco.tsx'
import { PanelListos } from '../features/cocina/listos/PanelListos.tsx'
import { PanelAgotados } from '../features/cocina/PanelAgotados.tsx'
import { RielCocina } from '../features/cocina/riel/RielCocina.tsx'
import { useAhora, useCocina, useNombresCombos } from '../features/cocina/useCocina.ts'
import { useAvisoSonoro } from '../features/cocina/useSonido.ts'
import { estadoDe, ETIQUETA_ESTADO } from '../features/pedidos/estados.ts'
import { useToast } from '../toast/toast-context.ts'
import { descargarBlob } from '../utils/archivos.ts'

export function CocinaPage() {
  const toast = useToast()
  const { pedidos, cargando, error, actualizadoEn, recargar } = useCocina()
  const nombresCombos = useNombresCombos()
  const ahora = useAhora()
  const [ocupadoId, setOcupadoId] = useState<number | null>(null)
  const [elegidoId, setElegidoId] = useState<number | null>(null)
  /** Unidades que ya salieron del horno por línea de pedido. Solo es una ayuda en pantalla: no se guarda. */
  const [hechos, setHechos] = useState<Record<number, number>>({})

  // Suena cuando entra un pedido nuevo por preparar (no al abrir la pantalla).
  const idsPorPreparar = useMemo(
    () => (actualizadoEn === null ? null : pedidos.filter((p) => estadoDe(p) === 'confirmado').map((p) => p.id)),
    [pedidos, actualizadoEn],
  )
  const sonido = useAvisoSonoro(idsPorPreparar)

  async function avanzar(pedido: Pedido, desde: EstadoPedidoNombre, hacia: EstadoPedidoNombre) {
    setOcupadoId(pedido.id)
    try {
      // El backend acepta cualquier cambio de estado sin validar, así que se comprueba aquí
      // que el pedido siga como lo vio el pizzero (por ejemplo, que no lo hayan cancelado).
      const actual = await pedidosApi.obtener(pedido.id)
      if (estadoDe(actual) !== desde) {
        toast.error(`El pedido N° ${pedido.numero_turno} cambió de estado. Se actualizó la pantalla.`)
        return
      }
      await pedidosApi.cambiarEstado(pedido.id, hacia)
      toast.exito(`Pedido N° ${pedido.numero_turno}: ${ETIQUETA_ESTADO[hacia].toLowerCase()}`)
    } catch (e) {
      toast.error(e)
    } finally {
      setOcupadoId(null)
      recargar()
    }
  }

  async function ticket(pedido: Pedido) {
    setOcupadoId(pedido.id)
    try {
      const pdf = await pedidosApi.ticketCocina(pedido.id)
      descargarBlob(pdf, `ticket-cocina-${pedido.numero_turno}.pdf`)
    } catch (e) {
      toast.error(e)
    } finally {
      setOcupadoId(null)
    }
  }

  /** Cada toque suma una unidad lista; al llegar a la cantidad del pedido, el siguiente toque la desmarca. */
  function marcarUnidad(detalleId: number, cantidad: number) {
    setHechos((actuales) => ({ ...actuales, [detalleId]: ((actuales[detalleId] ?? 0) + 1) % (cantidad + 1) }))
  }

  // Los más antiguos primero: son los que llevan más tiempo esperando.
  const porEstado = (estado: EstadoPedidoNombre) =>
    pedidos
      .filter((p) => estadoDe(p) === estado)
      .toSorted((a, b) => a.fecha.localeCompare(b.fecha) || a.id - b.id)

  const porPreparar = porEstado('confirmado')
  const enPreparacion = porEstado('en_preparacion')
  const listos = porEstado('listo')

  // Al centro va el pedido elegido; si no hay (o ya salió de cocina), el que está en el horno o el más antiguo.
  const enFoco = [...enPreparacion, ...porPreparar].find((p) => p.id === elegidoId) ?? enPreparacion[0] ?? porPreparar[0] ?? null

  return (
    <section className={`${styles.page} ${styles.paginaAncha}`}>
      <BarraCocina
        porPreparar={porPreparar.length}
        enPreparacion={enPreparacion.length}
        listos={listos.length}
        sonidoActivo={sonido.activo}
        onSonido={sonido.alternar}
        actualizadoEn={actualizadoEn}
        onActualizar={recargar}
      />

      {error && (
        <p className={styles.aviso} role="alert">
          No se pudo actualizar: {error}. Se muestran los últimos pedidos recibidos.
        </p>
      )}
      {cargando && <p className={styles.vacio}>Cargando pedidos…</p>}

      {!cargando && (
        <div className={styles.layout}>
          <RielCocina
            porPreparar={porPreparar}
            enPreparacion={enPreparacion}
            elegidoId={enFoco?.id ?? null}
            ahora={ahora}
            onElegir={setElegidoId}
          />

          {enFoco ? (
            <PedidoFoco
              key={enFoco.id}
              pedido={enFoco}
              ahora={ahora}
              nombresCombos={nombresCombos}
              hechos={hechos}
              ocupado={ocupadoId === enFoco.id}
              onTocarDetalle={marcarUnidad}
              onAvanzar={(desde, hacia) => void avanzar(enFoco, desde, hacia)}
              onTicket={() => void ticket(enFoco)}
            />
          ) : (
            <div className={styles.sinPedido}>
              <span className={styles.circuloVacio} aria-hidden="true">
                <Pizza size={56} />
              </span>
              <strong>Todo al día</strong>
              <p>No hay pedidos por preparar. Cuando entre uno, aparece aquí.</p>
            </div>
          )}

          <div className={styles.lateral}>
            <PanelListos pedidos={listos} ahora={ahora} ocupadoId={ocupadoId} onTicket={(p) => void ticket(p)} />
            <PanelAgotados abierto />
          </div>
        </div>
      )}
    </section>
  )
}
