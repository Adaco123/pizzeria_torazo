/**
 * Búsqueda del menú: ignora mayúsculas y tildes ("pina" encuentra "piña").
 * Si quien busca escribe la ñ, se respeta: "piña" no trae "espinaca".
 */
const MARCA_ENE = '\u0001'

function plegar(texto: string, conservarEne: boolean): string {
  let s = texto.toLowerCase()
  if (conservarEne) s = s.replace(/ñ/g, MARCA_ENE)
  s = s.normalize('NFD').replace(/[̀-ͯ]/g, '')
  return conservarEne ? s.replace(new RegExp(MARCA_ENE, 'g'), 'ñ') : s
}

export interface Buscador {
  /** No se escribió nada: todo coincide. */
  vacio: boolean
  coincide: (texto: string) => boolean
  /** Dónde está lo buscado dentro del texto (para resaltarlo), o null. */
  rango: (texto: string) => [number, number] | null
}

export function crearBuscador(consulta: string): Buscador {
  const limpia = consulta.trim()
  const estricta = limpia.toLowerCase().includes('ñ')
  const aguja = plegar(limpia, estricta)
  return {
    vacio: aguja === '',
    coincide: (texto) => aguja === '' || plegar(texto, estricta).includes(aguja),
    rango: (texto) => {
      if (aguja === '') return null
      const inicio = plegar(texto, estricta).indexOf(aguja)
      return inicio < 0 ? null : [inicio, inicio + aguja.length]
    },
  }
}

export function porNombre<T extends { nombre: string }>(a: T, b: T): number {
  return a.nombre.localeCompare(b.nombre, 'es')
}
