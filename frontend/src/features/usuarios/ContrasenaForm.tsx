import { useState, type SubmitEvent } from 'react'
import { authApi } from '../../apis/auth.ts'
import { useToast } from '../../toast/toast-context.ts'
import styles from '../catalogo/Catalogo.module.css'

const MINIMO = 6

interface PropsPropia {
  /** Cada usuario cambia la suya, con la actual. */
  modo: 'propia'
}

interface PropsDeOtro {
  /** El administrador le pone una nueva a otro usuario (sin pedir la actual). */
  modo: 'otro'
  usuarioId: number
  nombre: string
  onListo: () => void
  onCancelar: () => void
}

export function ContrasenaForm(props: PropsPropia | PropsDeOtro) {
  const toast = useToast()
  const [actual, setActual] = useState('')
  const [nueva, setNueva] = useState('')
  const [repetida, setRepetida] = useState('')
  const [enviando, setEnviando] = useState(false)
  const propia = props.modo === 'propia'

  async function guardar(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (nueva.length < MINIMO) {
      toast.error(`La contraseña debe tener al menos ${MINIMO} caracteres`)
      return
    }
    if (nueva !== repetida) {
      toast.error('Las dos contraseñas nuevas no coinciden')
      return
    }

    setEnviando(true)
    try {
      if (props.modo === 'propia') {
        await authApi.cambiarContrasena({ contra_actual: actual, contra_nueva: nueva })
        toast.exito('Contraseña cambiada')
        setActual('')
        setNueva('')
        setRepetida('')
      } else {
        await authApi.resetearContrasena(props.usuarioId, nueva)
        toast.exito(`Contraseña de ${props.nombre} restablecida`)
        props.onListo()
      }
    } catch (e) {
      toast.error(e)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <section className={styles.card}>
      <h2>{propia ? 'Cambiar mi contraseña' : `Nueva contraseña para ${props.nombre}`}</h2>
      {!propia && (
        <p className={styles.muted}>Dásela a la persona en privado; después puede cambiarla desde «Mi cuenta».</p>
      )}
      <form className={styles.form} onSubmit={guardar}>
        {propia && (
          <label className={styles.field}>
            <span>Contraseña actual</span>
            <input
              type="password"
              value={actual}
              onChange={(e) => setActual(e.target.value)}
              required
              autoComplete="current-password"
            />
          </label>
        )}
        <label className={styles.field}>
          <span>Contraseña nueva (mínimo {MINIMO} caracteres)</span>
          <input
            type="password"
            value={nueva}
            onChange={(e) => setNueva(e.target.value)}
            required
            autoComplete="new-password"
          />
        </label>
        <label className={styles.field}>
          <span>Repite la contraseña nueva</span>
          <input
            type="password"
            value={repetida}
            onChange={(e) => setRepetida(e.target.value)}
            required
            autoComplete="new-password"
          />
        </label>
        <button className={styles.primary} type="submit" disabled={enviando}>
          {enviando ? 'Guardando…' : propia ? 'Cambiar contraseña' : 'Restablecer contraseña'}
        </button>
        {!propia && (
          <button className={styles.secondary} type="button" disabled={enviando} onClick={props.onCancelar}>
            Cancelar
          </button>
        )}
      </form>
    </section>
  )
}
