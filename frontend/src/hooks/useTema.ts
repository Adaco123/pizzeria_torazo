import { useState } from 'react'

export type Tema = 'claro' | 'oscuro'

const CLAVE = 'torazo-tema'

function temaActual(): Tema {
  return document.documentElement.dataset.theme === 'dark' ? 'oscuro' : 'claro'
}

/** Tema claro u oscuro de la app. Se guarda en este navegador; sin elegir, sigue al sistema (ver index.html). */
export function useTema() {
  const [tema, setTema] = useState<Tema>(temaActual)

  function elegir(nuevo: Tema) {
    document.documentElement.dataset.theme = nuevo === 'oscuro' ? 'dark' : 'light'
    try {
      localStorage.setItem(CLAVE, nuevo)
    } catch {
      // Sin almacenamiento (ventana privada): el tema vale solo para esta visita.
    }
    setTema(nuevo)
  }

  return { tema, alternar: () => elegir(tema === 'oscuro' ? 'claro' : 'oscuro') }
}
