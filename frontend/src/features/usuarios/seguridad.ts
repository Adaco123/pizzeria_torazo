/** Largo mínimo que acepta el formulario. Es el mismo que valida el backend. */
export const MINIMO_CONTRASENA = 6

export type NivelContrasena = 0 | 1 | 2 | 3 | 4

export const ETIQUETA_NIVEL: Record<NivelContrasena, string> = {
  0: '—',
  1: 'Básica',
  2: 'Aceptable',
  3: 'Buena',
  4: 'Muy buena',
}

/**
 * Qué tan segura se ve una contraseña (0 a 4). Es solo una ayuda visual: lo único que se
 * exige al guardar es el largo mínimo y que las dos contraseñas nuevas coincidan.
 */
export function nivelDeContrasena(contrasena: string): NivelContrasena {
  if (contrasena.length < MINIMO_CONTRASENA) return 0
  let puntos = 1
  if (contrasena.length >= 10) puntos++
  if (/[a-z]/.test(contrasena) && /[A-Z]/.test(contrasena)) puntos++
  if (/\d/.test(contrasena) && /[^A-Za-z0-9]/.test(contrasena)) puntos++
  return puntos as NivelContrasena
}
