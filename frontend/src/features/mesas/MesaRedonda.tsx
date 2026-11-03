import { AlertTriangle, Pizza, Receipt } from 'lucide-react'
import type { CSSProperties } from 'react'
import type { Mesa } from '../../apis/mesas.ts'
import { formatearMonto } from '../../utils/formato.ts'
import { minutosDesde } from '../cocina/tiempo.ts'
import { cuentaDe, estadoDeMesa, etiquetaMesa, textoAbierta } from './estadoMesa.ts'
import styles from './Mesas.module.css'

/** Las sillas son solo adorno: el backend no guarda cuántas personas caben en cada mesa. */
const SILLAS = [0, 90, 180, 270]

interface Props {
  mesa: Mesa
  ahora: number
  seleccionada: boolean
  atenuada: boolean
  onElegir: () => void
}

/** Una mesa del plano: círculo con su número, lo que lleva y cuánto tiempo hace que se abrió. */
export function MesaRedonda({ mesa, ahora, seleccionada, atenuada, onElegir }: Props) {
  const estado = estadoDeMesa(mesa)
  const cuenta = cuentaDe(mesa)
  const clases = [styles.mesa, styles[estado], seleccionada && styles.seleccionada, atenuada && styles.atenuada]

  return (
    <button
      type="button"
      className={clases.filter(Boolean).join(' ')}
      aria-label={etiquetaMesa(mesa)}
      aria-pressed={seleccionada}
      onClick={onElegir}
    >
      {SILLAS.map((angulo) => (
        <i key={angulo} className={styles.silla} style={{ '--a': angulo } as CSSProperties} aria-hidden="true" />
      ))}
      {cuenta && (cuenta.rondas_listas > 0 || cuenta.pidio_cuenta || cuenta.turno_cerrado) && (
        <span className={styles.insignias} aria-hidden="true">
          {cuenta.rondas_listas > 0 && (
            <i title="Lista para llevar">
              <Pizza size={16} />
            </i>
          )}
          {cuenta.pidio_cuenta && (
            <i title="Pidió la cuenta">
              <Receipt size={16} />
            </i>
          )}
          {cuenta.turno_cerrado && (
            <i title="Del turno anterior">
              <AlertTriangle size={16} />
            </i>
          )}
        </span>
      )}
      <span className={styles.mesaCirculo}>
        <span className={styles.mesaNumero}>{mesa.numero}</span>
        <span className={styles.mesaMonto}>{cuenta ? formatearMonto(cuenta.total) : 'Libre'}</span>
        {cuenta && <span className={styles.mesaTiempo}>{textoAbierta(minutosDesde(cuenta.abierta_en, ahora))}</span>}
      </span>
    </button>
  )
}
