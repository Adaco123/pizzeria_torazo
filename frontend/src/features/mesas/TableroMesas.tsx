import { useMemo, useState, type CSSProperties } from 'react'
import { mesasApi } from '../../apis/mesas.ts'
import type { Mesa } from '../../apis/mesas.ts'
import { pedidosApi } from '../../apis/pedidos.ts'
import { useAuth } from '../../auth/auth-context.ts'
import { useToast } from '../../toast/toast-context.ts'
import { Hoja } from '../caja/Hoja.tsx'
import { useAhora } from '../cocina/useCocina.ts'
import { useAvisoSonoro } from '../cocina/useSonido.ts'
import { estadoDe } from '../pedidos/estados.ts'
import base from '../pedidos/Pedidos.module.css'
import { AtencionMesas } from './AtencionMesas.tsx'
import { BotonSonidoIcono } from './BotonSonidoIcono.tsx'
import { cuentaDe, FILTROS, itemsDeAtencion, type FiltroMesas, type ItemAtencion } from './estadoMesa.ts'
import { HerramientasMesas } from './HerramientasMesas.tsx'
import styles from './Mesas.module.css'
import { PanelMesa } from './PanelMesa.tsx'
import { PlanoMesas } from './PlanoMesas.tsx'
import { useMediaQuery } from './useMediaQuery.ts'
import { useMesas } from './useMesas.ts'

/** Desde este ancho la cuenta va en un panel al lado; en pantallas más chicas, en una ventana. */
const PANEL_FIJO = '(min-width: 1100px)'

interface Elegida {
  mesaId: number
  /** Se guarda al abrir una mesa, para mostrar su cuenta sin esperar a que se actualice el plano. */
  cuentaId: number | null
}

export function TableroMesas() {
  const { mesas, error, recargar } = useMesas()
  const { hasRole } = useAuth()
  const toast = useToast()
  const ahora = useAhora()
  const panelFijo = useMediaQuery(PANEL_FIJO)
  const [filtro, setFiltro] = useState<FiltroMesas>('todas')
  const [elegida, setElegida] = useState<Elegida | null>(null)
  const [ocupadoClave, setOcupadoClave] = useState<string | null>(null)
  const [abriendo, setAbriendo] = useState(false)

  // Un id por cada ronda lista: suena cuando cocina deja una nueva, no cuando entregan una.
  const idsListos = useMemo(
    () =>
      mesas === null
        ? null
        : mesas.flatMap((m) => {
            const cuenta = cuentaDe(m)
            return cuenta ? Array.from({ length: cuenta.rondas_listas }, (_, i) => cuenta.id * 100 + i + 1) : []
          }),
    [mesas],
  )
  const sonido = useAvisoSonoro(idsListos)

  const puedeCobrar = hasRole('Cajero', 'Administrador')
  const mesaElegida = mesas?.find((m) => m.id === elegida?.mesaId) ?? null
  const cuentaId = (mesaElegida && cuentaDe(mesaElegida)?.id) ?? elegida?.cuentaId ?? null

  function elegir(mesa: Mesa) {
    setElegida({ mesaId: mesa.id, cuentaId: cuentaDe(mesa)?.id ?? null })
  }

  function cerrarPanel() {
    setElegida(null)
    recargar()
  }

  async function abrir() {
    if (!mesaElegida) return
    setAbriendo(true)
    try {
      const cuenta = await mesasApi.abrir(mesaElegida.id)
      // Casi siempre se abre para pedir: la ronda queda lista y el mesero va directo al menú.
      await mesasApi.nuevaRonda(cuenta.id).catch(() => undefined)
      setElegida({ mesaId: mesaElegida.id, cuentaId: cuenta.id })
      toast.exito(`Mesa ${mesaElegida.numero} abierta`)
    } catch (e) {
      toast.error(e)
    } finally {
      setAbriendo(false)
      recargar()
    }
  }

  /** Marca como entregadas todas las rondas listas de la mesa, confirmando antes que siguen listas. */
  async function entregar(item: ItemAtencion) {
    setOcupadoClave(item.clave)
    try {
      const cuenta = await mesasApi.cuenta(item.cuenta.id)
      const listas = cuenta.rondas_detalle.filter((r) => estadoDe(r) === 'listo')
      if (listas.length === 0) {
        toast.error(`La mesa ${item.mesa.numero} ya no tiene rondas listas. Se actualizó.`)
      } else {
        for (const ronda of listas) await pedidosApi.cambiarEstado(ronda.id, 'entregado')
        toast.exito(
          listas.length === 1
            ? `Mesa ${item.mesa.numero}: ronda entregada`
            : `Mesa ${item.mesa.numero}: ${listas.length} rondas entregadas`,
        )
      }
    } catch (e) {
      toast.error(e)
    } finally {
      setOcupadoClave(null)
      recargar()
    }
  }

  const panel = (
    <PanelMesa
      mesa={mesaElegida}
      cuentaId={cuentaId}
      abriendo={abriendo}
      onAbrir={() => void abrir()}
      onCambio={recargar}
      onTerminar={cerrarPanel}
    />
  )

  return (
    <section className={`${base.page} ${base.pageAncha}`}>
      <div className={base.headerRow}>
        <h1>Mesas</h1>
        <div className={styles.herramientas}>
          <HerramientasMesas />
          <BotonSonidoIcono activo={sonido.activo} onAlternar={sonido.alternar} />
        </div>
      </div>

      {error && !mesas && (
        <p className={base.error} role="alert">
          {error}
        </p>
      )}
      {!mesas && !error && <p className={base.muted}>Cargando mesas…</p>}
      {mesas && mesas.length === 0 && (
        <p className={base.muted}>Todavía no hay mesas. El administrador las crea en Administración → Mesas.</p>
      )}

      {mesas && mesas.length > 0 && (
        <div className={styles.tablero}>
          <AtencionMesas
            items={itemsDeAtencion(mesas, ahora)}
            elegidaMesaId={elegida?.mesaId ?? null}
            ocupadoClave={ocupadoClave}
            puedeCobrar={puedeCobrar}
            onElegir={elegir}
            onEntregar={(item) => void entregar(item)}
          />

          <section className={`${base.card} ${styles.zonaPlano}`}>
            <div className={base.chips} role="group" aria-label="Filtrar mesas">
              {FILTROS.map((f) => {
                const activo = filtro === f.id
                return (
                  <button
                    key={f.id}
                    type="button"
                    className={activo ? base.chipActive : base.chip}
                    aria-pressed={activo}
                    onClick={() => setFiltro(f.id)}
                  >
                    {f.texto}
                    <span className={activo ? `${styles.conteo} ${styles.conteoOn}` : styles.conteo}>
                      {mesas.filter(f.coincide).length}
                    </span>
                  </button>
                )
              })}
            </div>
            <div className={styles.leyenda} aria-hidden="true">
              <span style={{ '--c': 'var(--color-disabled)' } as CSSProperties}>
                <i />
                Libre
              </span>
              <span style={{ '--c': 'var(--color-primary)' } as CSSProperties}>
                <i />
                Ocupada
              </span>
              <span style={{ '--c': 'var(--color-success)' } as CSSProperties}>
                <i />
                Lista para llevar
              </span>
              <span style={{ '--c': 'var(--color-warning)' } as CSSProperties}>
                <i />
                Pidió la cuenta
              </span>
            </div>
            <PlanoMesas
              mesas={mesas}
              filtro={filtro}
              ahora={ahora}
              seleccionadaId={elegida?.mesaId ?? null}
              onElegir={elegir}
            />
          </section>

          {panelFijo && <aside className={styles.detalle} aria-label="Cuenta de la mesa">{panel}</aside>}
        </div>
      )}

      {!panelFijo && mesaElegida && (
        <Hoja titulo={`Mesa ${mesaElegida.numero}`} onCerrar={cerrarPanel}>
          {panel}
        </Hoja>
      )}
    </section>
  )
}
