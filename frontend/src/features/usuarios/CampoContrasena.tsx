import { Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'
import styles from './Contrasena.module.css'

interface Props {
  etiqueta: string
  valor: string
  onCambio: (valor: string) => void
  autoComplete: 'current-password' | 'new-password'
}

/** Campo de contraseña con un ojo para ver lo que se escribe. */
export function CampoContrasena({ etiqueta, valor, onCambio, autoComplete }: Props) {
  const [visible, setVisible] = useState(false)

  return (
    <label className={styles.campo}>
      <span>{etiqueta}</span>
      <span className={styles.entrada}>
        <input
          type={visible ? 'text' : 'password'}
          value={valor}
          onChange={(e) => onCambio(e.target.value)}
          required
          autoComplete={autoComplete}
        />
        <button
          className={styles.ojo}
          type="button"
          aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          aria-pressed={visible}
          onClick={() => setVisible((v) => !v)}
        >
          {visible ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
        </button>
      </span>
    </label>
  )
}
