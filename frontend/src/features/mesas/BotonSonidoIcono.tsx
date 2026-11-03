import { Volume2, VolumeX } from 'lucide-react'
import riel from '../caja/riel/Riel.module.css'

interface Props {
  activo: boolean
  onAlternar: () => void
  /** Qué avisa el sonido, para el lector de pantalla: «ronda lista», «pedido nuevo»… */
  aviso?: string
}

/** El mismo ícono de sonido que tiene la lista de pedidos de Caja: verde cuando el aviso está activado. */
export function BotonSonidoIcono({ activo, onAlternar, aviso = 'ronda lista' }: Props) {
  return (
    <button
      type="button"
      className={riel.icono}
      aria-pressed={activo}
      aria-label={activo ? `Silenciar aviso de ${aviso}` : `Activar aviso sonoro de ${aviso}`}
      title={activo ? 'Sonido activado' : 'Activar sonido'}
      onClick={onAlternar}
    >
      {activo ? <Volume2 size={18} aria-hidden="true" /> : <VolumeX size={18} aria-hidden="true" />}
    </button>
  )
}
