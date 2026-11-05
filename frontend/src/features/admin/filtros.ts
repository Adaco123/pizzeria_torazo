export type FiltroEstado = 'todos' | 'activos' | 'inactivos'

/** ¿Pasa un elemento activo/inactivo el filtro Todos / Activos / Inactivos? */
export function coincideEstado(filtro: FiltroEstado, activo: boolean): boolean {
  return filtro === 'todos' || (filtro === 'activos') === activo
}
