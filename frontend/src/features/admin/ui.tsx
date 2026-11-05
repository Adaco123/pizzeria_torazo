import { Search } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import type { FiltroEstado } from './filtros.ts'
import styles from './Ui.module.css'

type Tono = 'ok' | 'off' | 'peligro' | 'activo'

interface BotonIconoProps {
  icono: LucideIcon
  titulo: string
  onClick: () => void
  tono?: Tono
  disabled?: boolean
  /** Para botones que despliegan algo (filas expandibles). */
  expandido?: boolean
}

/** Botón cuadrado con solo un ícono; el nombre sale al pasar el cursor y lo lee el lector de pantalla. */
export function BotonIcono({ icono: Icono, titulo, onClick, tono, disabled, expandido }: BotonIconoProps) {
  return (
    <button
      type="button"
      className={tono ? `${styles.ib} ${styles[tono]}` : styles.ib}
      title={titulo}
      aria-label={titulo}
      aria-expanded={expandido}
      disabled={disabled}
      onClick={onClick}
    >
      <Icono size={16} aria-hidden="true" />
    </button>
  )
}

/** Contenedor de botones de acción alineados a la derecha de la fila. */
export function Acciones({ children }: { children: ReactNode }) {
  return <div className={styles.acc}>{children}</div>
}

export function EstadoPildora({ activo, on = 'Activo', off = 'Inactivo' }: { activo: boolean; on?: string; off?: string }) {
  return <span className={`${styles.estado} ${activo ? styles.estadoOn : styles.estadoOff}`}>{activo ? on : off}</span>
}

interface CabezaProps {
  icono: LucideIcon
  titulo: string
  cuenta?: number
  children?: ReactNode
}

/** Encabezado de tarjeta: ícono, título, contador y (a la derecha) lo que se pase como hijos. */
export function Cabeza({ icono: Icono, titulo, cuenta, children }: CabezaProps) {
  return (
    <div className={styles.cabeza}>
      <h2>
        <span className={styles.icono}>
          <Icono size={18} aria-hidden="true" />
        </span>
        {titulo}
      </h2>
      {cuenta !== undefined && <span className={styles.cuenta}>{cuenta}</span>}
      <span className={styles.espacio} />
      {children}
    </div>
  )
}

export function Vacio({ icono: Icono, titulo, detalle }: { icono: LucideIcon; titulo: string; detalle?: string }) {
  return (
    <div className={styles.vacio}>
      <Icono size={36} aria-hidden="true" />
      <p>{titulo}</p>
      {detalle && <span>{detalle}</span>}
    </div>
  )
}

export function Buscador({ valor, onChange, etiqueta }: { valor: string; onChange: (v: string) => void; etiqueta: string }) {
  return (
    <label className={styles.busca}>
      <Search size={15} aria-hidden="true" />
      <input type="search" placeholder={etiqueta} aria-label={etiqueta} value={valor} onChange={(e) => onChange(e.target.value)} />
    </label>
  )
}

/** Segmentado Todos / Activos / Inactivos con contadores. */
export function FiltroEstadoBarra({ valor, onChange, items }: { valor: FiltroEstado; onChange: (f: FiltroEstado) => void; items: { activo: boolean }[] }) {
  const activos = items.filter((i) => i.activo).length
  const opciones: [FiltroEstado, string, number][] = [
    ['todos', 'Todos', items.length],
    ['activos', 'Activos', activos],
    ['inactivos', 'Inactivos', items.length - activos],
  ]
  return (
    <div className={styles.segmento} role="group" aria-label="Filtrar por estado">
      {opciones.map(([id, nombre, n]) => (
        <button key={id} type="button" aria-pressed={valor === id} onClick={() => onChange(id)}>
          {nombre} <i>{n}</i>
        </button>
      ))}
    </div>
  )
}
