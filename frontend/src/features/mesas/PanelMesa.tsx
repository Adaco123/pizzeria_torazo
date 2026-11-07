import { UtensilsCrossed } from 'lucide-react'
import type { Mesa } from '../../apis/mesas.ts'
import { CuentaMesaView } from './CuentaMesaView.tsx'
import styles from './Mesas.module.css'

interface Props {
  mesa: Mesa | null
  /** Cuenta abierta de la mesa elegida; null si está libre. */
  cuentaId: number | null
  abriendo: boolean
  onAbrir: () => void
  onCambio: () => void
  onTerminar: () => void
}

/** Lo que se ve al elegir una mesa: nada elegido, mesa libre para abrir, o su cuenta completa. */
export function PanelMesa({ mesa, cuentaId, abriendo, onAbrir, onCambio, onTerminar }: Props) {
  if (!mesa) {
    return (
      <div className={styles.panelVacio}>
        <div className={styles.panelCirculo}>
          <UtensilsCrossed size={52} aria-hidden="true" />
        </div>
        <b>Toca una mesa</b>
        <p>Verás su cuenta y sus rondas, y podrás cobrarla.</p>
      </div>
    )
  }
  if (cuentaId === null) {
    return (
      <div className={styles.panelVacio}>
        <button type="button" className={styles.abrir} disabled={abriendo} onClick={onAbrir}>
          <UtensilsCrossed size={34} aria-hidden="true" />
          <span>{abriendo ? 'Abriendo…' : `Abrir mesa ${mesa.numero} y tomar pedido`}</span>
        </button>
        <b>Mesa {mesa.numero} libre</b>
        <p>Se abre y queda lista para anotar lo que pidan.</p>
      </div>
    )
  }
  // `key` reinicia el descuento y lo escrito al pasar de una mesa a otra.
  return <CuentaMesaView key={cuentaId} cuentaId={cuentaId} embebido onCambio={onCambio} onTerminar={onTerminar} />
}
