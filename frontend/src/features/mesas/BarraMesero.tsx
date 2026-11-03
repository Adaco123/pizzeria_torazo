import { Ban } from 'lucide-react'
import { useState } from 'react'
import { HojaAgotados } from '../caja/barra/HojaAgotados.tsx'
import styles from '../caja/barra/Barra.module.css'
import { Hoja } from '../caja/Hoja.tsx'

/**
 * Herramientas del mesero: solo avisar que algo se agotó.
 * No hay turno, gastos ni stock: eso es de caja y el backend no se lo permite.
 */
export function BarraMesero() {
  const [abierta, setAbierta] = useState(false)

  return (
    <div className={styles.barra} role="toolbar" aria-label="Herramientas del mesero">
      <button type="button" className={styles.ghost} onClick={() => setAbierta(true)}>
        <Ban size={16} aria-hidden="true" />
        Agotados
      </button>
      {abierta && (
        <Hoja titulo="Avisar producto agotado" onCerrar={() => setAbierta(false)}>
          <HojaAgotados soloAvisar />
        </Hoja>
      )}
    </div>
  )
}
