import { ArrowDownToLine, Ban, Eye, EyeOff, GlassWater, MoreHorizontal, PowerOff } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { turnosApi } from '../../../apis/turnos.ts'
import type { Turno } from '../../../apis/turnos.ts'
import { aFecha, formatearMonto } from '../../../utils/formato.ts'
import { PanelAgotados } from '../../cocina/PanelAgotados.tsx'
import { PanelStockBebidas } from '../../stock/PanelStockBebidas.tsx'
import { MiTurnoPanel } from '../../turnos/MiTurnoPanel.tsx'
import { PanelGastos } from '../../turnos/PanelGastos.tsx'
import { Hoja } from '../Hoja.tsx'
import styles from './Barra.module.css'

type Herramienta = 'gastos' | 'agotados' | 'stock' | 'cierre'

interface Props {
  turno: Turno
  usuarioId: number
  esAdmin: boolean
  /** Cambia cuando hay ventas nuevas: se vuelve a leer el monto de caja si está visible. */
  version: number
  onCambio: () => void
  onVerResumen: (turnoId: number) => void
}

const hora = new Intl.DateTimeFormat('es-BO', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/La_Paz' })

const ACCIONES: { id: Herramienta; texto: string; icono: typeof Ban; peligro?: boolean }[] = [
  { id: 'gastos', texto: 'Gastos', icono: ArrowDownToLine },
  { id: 'agotados', texto: 'Agotados', icono: Ban },
  { id: 'stock', texto: 'Stock', icono: GlassWater },
  { id: 'cierre', texto: 'Cerrar turno', icono: PowerOff, peligro: true },
]

const TITULOS: Record<Herramienta, string> = {
  gastos: 'Gastos y retiros de caja',
  agotados: 'Productos agotados',
  stock: 'Stock de bebidas',
  cierre: 'Cerrar turno',
}

/**
 * Barra superior de la caja: estado del turno y herramientas (gastos, agotados, stock, cierre).
 * El cajero cierra «a ciegas», así que el monto esperado en caja solo lo ve el administrador.
 */
export function BarraCaja({ turno, usuarioId, esAdmin, version, onCambio, onVerResumen }: Props) {
  const [abierta, setAbierta] = useState<Herramienta | null>(null)
  const [menu, setMenu] = useState(false)
  const [verCaja, setVerCaja] = useState(false)
  const [efectivo, setEfectivo] = useState<number | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!esAdmin || !verCaja) return
    const controller = new AbortController()
    turnosApi
      .resumen(turno.id, { signal: controller.signal })
      .then((r) => setEfectivo(r.efectivo_esperado))
      .catch(() => setEfectivo(null))
    return () => controller.abort()
  }, [esAdmin, verCaja, turno.id, version])

  useEffect(() => {
    if (!menu) return
    const cerrar = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenu(false)
    }
    document.addEventListener('mousedown', cerrar)
    return () => document.removeEventListener('mousedown', cerrar)
  }, [menu])

  function elegir(id: Herramienta) {
    setMenu(false)
    setAbierta(id)
  }

  return (
    <div className={styles.barra} role="toolbar" aria-label="Turno y herramientas de caja">
      <div className={styles.turno}>
        <span className={styles.punto} aria-hidden="true" />
        <span>
          Turno abierto<span className={styles.desde}> · desde {hora.format(aFecha(turno.apertura))}</span>
          {esAdmin && verCaja && (
            <>
              {' · '}Caja {efectivo === null ? '…' : formatearMonto(efectivo)}
            </>
          )}
        </span>
        {esAdmin && (
          <button
            type="button"
            className={styles.ojo}
            aria-pressed={verCaja}
            aria-label={verCaja ? 'Ocultar el monto de caja' : 'Mostrar el monto de caja'}
            onClick={() => setVerCaja((v) => !v)}
          >
            {verCaja ? <EyeOff size={15} aria-hidden="true" /> : <Eye size={15} aria-hidden="true" />}
          </button>
        )}
      </div>

      <div className={styles.espacio} />

      <div className={styles.acciones}>
        {ACCIONES.map(({ id, texto, icono: Icono, peligro }) => (
          <button key={id} type="button" className={peligro ? `${styles.ghost} ${styles.peligro}` : styles.ghost} onClick={() => elegir(id)}>
            <Icono size={16} aria-hidden="true" />
            {texto}
          </button>
        ))}
      </div>

      <div className={styles.masWrap} ref={menuRef}>
        <button type="button" className={styles.mas} aria-label="Más opciones" aria-expanded={menu} onClick={() => setMenu((v) => !v)}>
          <MoreHorizontal size={20} aria-hidden="true" />
        </button>
        {menu && (
          <div className={styles.menu} role="menu">
            {ACCIONES.map(({ id, texto, icono: Icono, peligro }) => (
              <button key={id} type="button" role="menuitem" className={peligro ? styles.peligro : undefined} onClick={() => elegir(id)}>
                <Icono size={16} aria-hidden="true" />
                {texto}
              </button>
            ))}
          </div>
        )}
      </div>

      {abierta && (
        <Hoja titulo={TITULOS[abierta]} onCerrar={() => setAbierta(null)}>
          {abierta === 'gastos' && <PanelGastos turnoId={turno.id} esAdmin={esAdmin} />}
          {abierta === 'agotados' && <PanelAgotados abierto />}
          {abierta === 'stock' && <PanelStockBebidas esAdmin={esAdmin} />}
          {abierta === 'cierre' && (
            <MiTurnoPanel
              turno={turno}
              usuarioId={usuarioId}
              onCambio={() => {
                setAbierta(null)
                onCambio()
              }}
              onVerResumen={onVerResumen}
              puedeVerResumenAbierto={esAdmin}
            />
          )}
        </Hoja>
      )}
    </div>
  )
}
