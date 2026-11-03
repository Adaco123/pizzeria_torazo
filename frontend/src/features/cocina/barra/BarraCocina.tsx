import { Ban, RefreshCw } from 'lucide-react'
import { useState } from 'react'
import barraCaja from '../../caja/barra/Barra.module.css'
import { HojaAgotados } from '../../caja/barra/HojaAgotados.tsx'
import { Hoja } from '../../caja/Hoja.tsx'
import riel from '../../caja/riel/Riel.module.css'
import { BotonSonidoIcono } from '../../mesas/BotonSonidoIcono.tsx'
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
  const [agotados, setAgotados] = useState(false)

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

      <button className={barraCaja.ghost} type="button" onClick={() => setAgotados(true)}>
        <Ban size={16} aria-hidden="true" />
        Agotados
      </button>
      <BotonSonidoIcono activo={sonidoActivo} onAlternar={onSonido} aviso="pedido nuevo por preparar" />
      {actualizadoEn !== null && <span className={styles.hora}>Actualizado a las {hora.format(actualizadoEn)}</span>}
      <button
        className={riel.icono}
        type="button"
        aria-label="Actualizar pedidos"
        title="Actualizar"
        onClick={onActualizar}
      >
        <RefreshCw size={18} aria-hidden="true" />
      </button>

      {agotados && (
        <Hoja titulo="Productos agotados" onCerrar={() => setAgotados(false)}>
          <HojaAgotados />
        </Hoja>
      )}
    </div>
  )
}
