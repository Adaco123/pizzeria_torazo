import { RefreshCw } from 'lucide-react'
import base from '../Cocina.module.css'
import { BotonSonido } from '../BotonSonido.tsx'
import styles from './Barra.module.css'

interface Props {
  porPreparar: number
  enPreparacion: number
  listos: number
  sonidoActivo: boolean
  onSonido: () => void
  actualizadoEn: number | null
  onActualizar: () => void
}

const hora = new Intl.DateTimeFormat('es-BO', { timeStyle: 'medium', timeZone: 'America/La_Paz' })

/** Barra superior de cocina: cuánto hay en cada etapa, el aviso sonoro y cuándo se actualizó la pantalla. */
export function BarraCocina({ porPreparar, enPreparacion, listos, sonidoActivo, onSonido, actualizadoEn, onActualizar }: Props) {
  return (
    <div className={styles.barra} role="toolbar" aria-label="Estado de la cocina">
      <h1 className={styles.titulo}>Cocina</h1>

      <span className={styles.conteo}>
        <b>{porPreparar}</b> por preparar
      </span>
      <span className={styles.conteo}>
        <b>{enPreparacion}</b> en preparación
      </span>
      <span className={`${styles.conteo} ${styles.conteoListo}`}>
        <b>{listos}</b> {listos === 1 ? 'listo' : 'listos'}
      </span>

      <div className={styles.espacio} />

      <BotonSonido activo={sonidoActivo} onAlternar={onSonido} />
      {actualizadoEn !== null && <span className={styles.hora}>Actualizado a las {hora.format(actualizadoEn)}</span>}
      <button className={base.secundario} type="button" onClick={onActualizar}>
        <RefreshCw size={15} aria-hidden="true" /> Actualizar
      </button>
    </div>
  )
}
