import styles from './Cocina.module.css'

interface Props {
  activo: boolean
  onAlternar: () => void
}

export function BotonSonido({ activo, onAlternar }: Props) {
  return (
    <button
      className={activo ? `${styles.secundario} ${styles.sonidoActivo}` : styles.secundario}
      type="button"
      aria-pressed={activo}
      onClick={onAlternar}
    >
      {activo ? 'Sonido activado' : 'Activar sonido'}
    </button>
  )
}
