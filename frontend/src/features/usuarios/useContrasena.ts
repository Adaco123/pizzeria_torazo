import { useState, type SubmitEvent } from 'react'
import { authApi } from '../../apis/auth.ts'
import { useToast } from '../../toast/toast-context.ts'
import { MINIMO_CONTRASENA } from './seguridad.ts'

export interface PropsPropia {
  /** Cada usuario cambia la suya, con la actual. */
  modo: 'propia'
}

export interface PropsDeOtro {
  /** El administrador le pone una nueva a otro usuario (sin pedir la actual). */
  modo: 'otro'
  usuarioId: number
  nombre: string
  onListo: () => void
  onCancelar: () => void
}

/** Lo escrito en el formulario y el guardado, comunes a «mi contraseña» y a «la de otro». */
export function useContrasena(props: PropsPropia | PropsDeOtro) {
  const toast = useToast()
  const [actual, setActual] = useState('')
  const [nueva, setNueva] = useState('')
  const [repetida, setRepetida] = useState('')
  const [enviando, setEnviando] = useState(false)
  const propia = props.modo === 'propia'

  async function guardar(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (nueva.length < MINIMO_CONTRASENA) {
      toast.error(`La contraseña debe tener al menos ${MINIMO_CONTRASENA} caracteres`)
      return
    }
    if (nueva !== repetida) {
      toast.error('Las dos contraseñas nuevas no coinciden')
      return
    }
    if (propia && nueva === actual) {
      toast.error('La contraseña nueva debe ser distinta de la actual')
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

  return { actual, setActual, nueva, setNueva, repetida, setRepetida, enviando, guardar }
}
