import { useCallback, useSyncExternalStore } from 'react'

/** true mientras la pantalla cumpla la consulta CSS (por ejemplo `(min-width: 1100px)`). */
export function useMediaQuery(consulta: string): boolean {
  const suscribir = useCallback(
    (avisar: () => void) => {
      const lista = window.matchMedia(consulta)
      lista.addEventListener('change', avisar)
      return () => lista.removeEventListener('change', avisar)
    },
    [consulta],
  )
  return useSyncExternalStore(suscribir, () => window.matchMedia(consulta).matches)
}
