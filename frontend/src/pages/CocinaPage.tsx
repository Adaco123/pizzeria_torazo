import { useMemo, useState } from 'react'
import { pedidosApi } from '../apis/pedidos.ts'
import type { EstadoPedidoNombre, Pedido } from '../apis/pedidos.ts'
import { BotonSonido } from '../features/cocina/BotonSonido.tsx'
import styles from '../features/cocina/Cocina.module.css'
import { PanelAgotados } from '../features/cocina/PanelAgotados.tsx'
import { TarjetaPedido } from '../features/cocina/TarjetaPedido.tsx'
import { useAhora, useCocina, useNombresCombos } from '../features/cocina/useCocina.ts'
import { useAvisoSonoro } from '../features/cocina/useSonido.ts'
import { estadoDe, ETIQUETA_ESTADO } from '../features/pedidos/estados.ts'
import { useToast } from '../toast/toast-context.ts'
import { descargarBlob } from '../utils/archivos.ts'

const COLUMNAS: { estado: EstadoPedidoNombre; titulo: string }[] = [
  { estado: 'confirmado', titulo: 'Por preparar' },
  { estado: 'en_preparacion', titulo: 'En preparación' },
  { estado: 'listo', titulo: 'Listos' },
]

const hora = new Intl.DateTimeFormat('es-BO', { timeStyle: 'medium', timeZone: 'America/La_Paz' })

export function CocinaPage() {
  const toast = useToast()
  const { pedidos, cargando, error, actualizadoEn, recargar } = useCocina()
  const nombresCombos = useNombresCombos()
  const ahora = useAhora()
  const [ocupadoId, setOcupadoId] = useState<number | null>(null)

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

  // Los más antiguos primero: son los que llevan más tiempo esperando.
  const porEstado = (estado: EstadoPedidoNombre) =>
    pedidos
      .filter((p) => estadoDe(p) === estado)
      .toSorted((a, b) => a.fecha.localeCompare(b.fecha) || a.id - b.id)

  return (
    <section className={styles.page}>
      <div className={styles.cabecera}>
        <h1>Cocina</h1>
        <div className={styles.estado}>
          <BotonSonido activo={sonido.activo} onAlternar={sonido.alternar} />
          {actualizadoEn !== null && <span>Actualizado a las {hora.format(actualizadoEn)}</span>}
          <button className={styles.secundario} type="button" onClick={recargar}>
            Actualizar
          </button>
        </div>
      </div>

      <PanelAgotados />

      {error && (
        <p className={styles.aviso} role="alert">
          No se pudo actualizar: {error}. Se muestran los últimos pedidos recibidos.
        </p>
      )}
      {cargando && <p className={styles.vacio}>Cargando pedidos…</p>}

      {!cargando && (
        <div className={styles.tablero}>
          {COLUMNAS.map(({ estado, titulo }) => {
            const lista = porEstado(estado)
            return (
              <section key={estado} className={styles.columna} aria-label={titulo}>
                <h2 className={styles.columnaTitulo}>
                  {titulo}
                  <span className={estado === 'listo' ? `${styles.contador} ${styles.contadorListo}` : styles.contador}>
                    {lista.length}
                  </span>
                </h2>
                {lista.length === 0 ? (
                  <p className={styles.columnaVacia}>Sin pedidos</p>
                ) : (
                  lista.map((pedido) => (
                    <TarjetaPedido
                      key={pedido.id}
                      pedido={pedido}
                      estado={estado}
                      ahora={ahora}
                      nombresCombos={nombresCombos}
                      ocupado={ocupadoId === pedido.id}
                      onAvanzar={avanzar}
                      onTicket={ticket}
                    />
                  ))
                )}
              </section>
            )
          })}
        </div>
      )}
    </section>
  )
}