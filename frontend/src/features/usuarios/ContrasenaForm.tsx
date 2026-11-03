import { ContrasenaDeOtro } from './ContrasenaDeOtro.tsx'
import { ContrasenaPropia } from './ContrasenaPropia.tsx'
import type { PropsDeOtro, PropsPropia } from './useContrasena.ts'

/**
 * - `propia`: «Mi cuenta». Dibuja el formulario y, al lado, el ticket de seguridad
 *   (son dos columnas de la rejilla de la pantalla).
 * - `otro`: el administrador le pone una contraseña nueva a otro usuario.
 */
export function ContrasenaForm(props: PropsPropia | PropsDeOtro) {
  return props.modo === 'propia' ? <ContrasenaPropia /> : <ContrasenaDeOtro {...props} />
}
