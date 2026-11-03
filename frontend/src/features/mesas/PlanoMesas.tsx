import type { Mesa } from '../../apis/mesas.ts'
import { FILTROS, type FiltroMesas } from './estadoMesa.ts'
import { MesaRedonda } from './MesaRedonda.tsx'
import styles from './Mesas.module.css'

interface Props {
  mesas: Mesa[]
  filtro: FiltroMesas
  ahora: number
  seleccionadaId: number | null
  onElegir: (mesa: Mesa) => void
}

/** Todas las mesas; las que no cumplen el filtro se atenúan pero no se mueven de lugar. */
export function PlanoMesas({ mesas, filtro, ahora, seleccionadaId, onElegir }: Props) {
  const coincide = (FILTROS.find((f) => f.id === filtro) ?? FILTROS[0]).coincide
  return (
    <div className={styles.plano} aria-label="Plano de mesas">
      {mesas.map((mesa) => (
        <MesaRedonda
          key={mesa.id}
          mesa={mesa}
          ahora={ahora}
          seleccionada={seleccionadaId === mesa.id}
          atenuada={!coincide(mesa)}
          onElegir={() => onElegir(mesa)}
        />
      ))}
    </div>
  )
}
