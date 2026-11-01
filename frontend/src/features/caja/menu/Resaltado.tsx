import type { Buscador } from './buscar.ts'

/** Muestra el texto con lo buscado marcado. */
export function Resaltado({ texto, buscador }: { texto: string; buscador: Buscador }) {
  const rango = buscador.rango(texto)
  if (!rango) return <>{texto}</>
  return (
    <>
      {texto.slice(0, rango[0])}
      <mark>{texto.slice(rango[0], rango[1])}</mark>
      {texto.slice(rango[1])}
    </>
  )
}
