const dia = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/La_Paz' })
const diaLargo = new Intl.DateTimeFormat('es-BO', {
  weekday: 'short',
  day: '2-digit',
  month: '2-digit',
  timeZone: 'UTC',
})

/** AAAA-MM-DD de hoy en horario de Bolivia, restando `diasAtras`. */
export function diaDeBolivia(diasAtras = 0): string {
  return dia.format(Date.now() - diasAtras * 86_400_000)
}

/** "lun 20/10" a partir de AAAA-MM-DD. */
export function etiquetaDia(fecha: string): string {
  return diaLargo.format(new Date(`${fecha}T00:00:00Z`))
}
