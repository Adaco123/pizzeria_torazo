import type { CSSProperties } from 'react'
import type { ProgresoPedido } from './tiempo.ts'
import styles from './AnilloTiempo.module.css'

interface Props {
  progreso: ProgresoPedido
  grande?: boolean
}

/** Anillo que se llena con el plazo del pedido: verde a tiempo, rojo suave si ya va corto, rojo fuerte si está atrasado. */
export function AnilloTiempo({ progreso, grande = false }: Props) {
  const tono = progreso.atrasado ? styles.atrasado : progreso.porcentaje >= 75 ? styles.apurado : ''
  return (
    <span
      className={`${styles.anillo} ${tono} ${grande ? styles.grande : ''}`}
      style={{ '--p': progreso.porcentaje } as CSSProperties}
      aria-hidden="true"
    >
      <span>{progreso.etiqueta}</span>
    </span>
  )
}
