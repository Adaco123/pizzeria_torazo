import type { Ingrediente } from '../../../apis/ingredientes.ts'
import { formatearMonto } from '../../../utils/formato.ts'
import { cx } from './letras.ts'
import type { ExtrasPorMitad, Lado } from './useSelectorPizza.ts'
import styles from './Selector.module.css'

interface Props {
  nombres: [string, string]
  extras: ExtrasPorMitad
  ingredientes: Ingrediente[]
  precioDe: (i: Ingrediente) => number
  lado: Lado
  onLado: (lado: Lado) => void
}

/** Dos tarjetas, una por mitad: dicen qué extras lleva cada una y marcan a cuál irá el próximo extra. */
export function TarjetasMitad({ nombres, extras, ingredientes, precioDe, lado, onLado }: Props) {
  return (
    <div className={styles.mitades}>
      {([0, 1] as const).map((h) => {
        const elegidos = ingredientes.filter((i) => (extras[h][i.id] ?? 0) > 0)
        const costo = elegidos.reduce((s, i) => s + extras[h][i.id] * precioDe(i), 0)
        const texto = elegidos.length
          ? `+${formatearMonto(costo)} · ${elegidos.map((i) => i.nombre + (extras[h][i.id] > 1 ? ` ×${extras[h][i.id]}` : '')).join(' · ')}`
          : lado === h
            ? 'Toca un extra para sumarlo aquí'
            : 'Sin extras'
        return (
          <button
            key={h}
            type="button"
            className={cx(lado === h && styles.activa)}
            aria-pressed={lado === h}
            onClick={() => onLado(h)}
          >
            <b>
              {lado === h ? '● ' : ''}½ {nombres[h]}
            </b>
            <span>{texto}</span>
          </button>
        )
      })}
    </div>
  )
}
