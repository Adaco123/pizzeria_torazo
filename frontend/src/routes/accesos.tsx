import type { ComponentType } from 'react'
import type { RolNombre } from '../api.ts'
import { AdminPage } from '../pages/AdminPage.tsx'
import { CocinaPage } from '../pages/CocinaPage.tsx'
import { PedidosPage } from '../pages/PedidosPage.tsx'
import { TurnosPage } from '../pages/TurnosPage.tsx'

export interface Acceso {
  path: string
  label: string
  /** Roles que pueden entrar. Es la única fuente de verdad: menú y rutas salen de aquí. */
  roles: RolNombre[]
  Page: ComponentType
}

export const ACCESOS: Acceso[] = [
  { path: '/pedidos', label: 'Pedidos', roles: ['Administrador', 'Cajero'], Page: PedidosPage },
  { path: '/turnos', label: 'Turnos', roles: ['Administrador', 'Cajero'], Page: TurnosPage },
  { path: '/cocina', label: 'Cocina', roles: ['Administrador', 'Pizzero'], Page: CocinaPage },
  { path: '/admin', label: 'Administración', roles: ['Administrador'], Page: AdminPage },
]

const INICIO: Record<RolNombre, string> = {
  Administrador: '/admin',
  Cajero: '/pedidos',
  Pizzero: '/cocina',
}

/** Pantalla a la que entra cada rol después de iniciar sesión. */
export function rutaInicial(rol: RolNombre | null): string {
  return rol ? INICIO[rol] : '/no-autorizado'
}