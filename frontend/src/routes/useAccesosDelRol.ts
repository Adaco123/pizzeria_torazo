import { useOutletContext } from 'react-router'
import type { Acceso } from './accesos.tsx'

/** Lo que `AppLayout` le pasa a la pantalla que se dibuja dentro de él. */
export interface ContextoLayout {
  /** Accesos que el rol del usuario puede abrir (los mismos del menú de arriba). */
  accesos: Acceso[]
}

/** Accesos permitidos al usuario actual. Vacío si la pantalla se usa fuera de `AppLayout`. */
export function useAccesosDelRol(): Acceso[] {
  // Solo se importa el tipo de `accesos.tsx`: no hay dependencia circular en tiempo de ejecución.
  return useOutletContext<ContextoLayout | undefined>()?.accesos ?? []
}
