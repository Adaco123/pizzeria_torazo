import { Check } from 'lucide-react'
import type { Buscador } from './buscar.ts'
import { Resaltado } from './Resaltado.tsx'
import { cx } from './letras.ts'
import styles from './Menu.module.css'

interface Props {
  nombre: string
  detalle?: string
  precio: number
  agotado?: boolean
  /** Acaba de agregarse: se muestra una marca un instante. */
  reciente?: boolean
  buscador: Buscador
  onAgregar: () => void
}

/** Combos, bebidas y otros productos sin tamaños: un toque agrega una unidad. */
export function TarjetaSimple({ nombre, detalle, precio, agotado = false, reciente = false, buscador, onAgregar }: Props) {
  return (
    <button
      type="button"
      className={cx(styles.tarjeta, agotado && styles.agotada, reciente && styles.reciente)}
      onClick={onAgregar}
      aria-label={agotado ? `${nombre}, agotado` : nombre}
    >
      <span className={styles.texto}>
        <b>
          <Resaltado texto={nombre} buscador={buscador} />

        </b>
        {detalle && (
          <small>
            <Resaltado texto={detalle} buscador={buscador} />
          </small>
        )}
      </span>
      {agotado && <i className={styles.pildoraAgotada}>Agotado</i>}
      <span className={cx(styles.precios, styles.unico)}>
        {reciente ? <Check size={20} aria-label="Agregado" /> : <span>{Math.round(precio)}</span>}
      </span>
    </button>
  )
}
