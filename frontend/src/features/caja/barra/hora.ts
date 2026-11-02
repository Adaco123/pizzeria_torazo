import { aFecha } from '../../../utils/formato.ts'

const formato = new Intl.DateTimeFormat('es-BO', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/La_Paz' })

/** "08:02" en hora de Bolivia. */
export function horaCorta(iso: string): string {
  return formato.format(aFecha(iso))
}
