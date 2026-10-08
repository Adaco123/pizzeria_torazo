import type { RolNombre } from '../api.ts'

/** Nombres con los que puede venir un rol desde la base de datos, ya sin mayúsculas ni tildes. */
const ALIAS: Record<string, RolNombre> = {
  administrador: 'Administrador',
  admin: 'Administrador',
  cajero: 'Cajero',
  cajera: 'Cajero',
  pizzero: 'Pizzero',
  pizzera: 'Pizzero',
}

/**
 * Convierte el rol que manda el backend (texto libre de la base de datos) en uno de los tres
 * roles que conoce la interfaz. Devuelve null si no lo reconoce.
 */
export function normalizarRol(valor: unknown): RolNombre | null {
  if (typeof valor !== 'string' || valor.trim() === '') return null

  const clave = valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
  const rol = ALIAS[clave] ?? null

  if (rol === null) {
    console.warn(
      `[auth] El rol «${valor}» no se reconoce. Roles válidos: Administrador, Cajero y Pizzero.`,
    )
  }
  return rol
}