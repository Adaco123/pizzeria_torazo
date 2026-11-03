import { Check } from 'lucide-react'
import styles from './Contrasena.module.css'
import { ETIQUETA_NIVEL, MINIMO_CONTRASENA, nivelDeContrasena } from './seguridad.ts'

interface Props {
  nueva: string
  repetida: string
  /** Solo cuando el usuario cambia la suya: se avisa si la nueva es igual a la actual. */
  actual?: string
  /** Sin caja ni título: para ponerla dentro de otro panel (el ticket de «Mi cuenta»). */
  plana?: boolean
}

/** Seguridad de la contraseña nueva y los requisitos que se van cumpliendo al escribir. */
export function FuerzaContrasena({ nueva, repetida, actual, plana = false }: Props) {
  const nivel = nivelDeContrasena(nueva)
  const requisitos = [
    { cumplido: nueva.length >= MINIMO_CONTRASENA, texto: `Al menos ${MINIMO_CONTRASENA} caracteres` },
    { cumplido: repetida !== '' && nueva === repetida, texto: 'Las dos contraseñas nuevas coinciden' },
    ...(actual === undefined
      ? []
      : [{ cumplido: nueva !== '' && nueva !== actual, texto: 'Es distinta de la actual' }]),
  ]

  return (
    <div className={plana ? `${styles.fuerza} ${styles.plana}` : styles.fuerza}>
      {!plana && (
        <div className={styles.fuerzaTexto}>
          <span>Seguridad de la contraseña nueva</span>
          <span>{ETIQUETA_NIVEL[nivel]}</span>
        </div>
      )}
      <div className={nivel > 0 ? `${styles.barras} ${styles[`nivel${nivel}`]}` : styles.barras} aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
      </div>
      <ul className={styles.requisitos}>
        {requisitos.map((r) => (
          <li key={r.texto} className={r.cumplido ? styles.cumplido : undefined}>
            <span className={styles.punto} aria-hidden="true">
              <Check size={12} />
            </span>
            {r.texto}
            <span className={styles.soloLector}>{r.cumplido ? ' (cumplido)' : ' (pendiente)'}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
