import type { ComponentType } from 'react'
import type { RolNombre } from '../api.ts'
import { AdminPage } from '../pages/AdminPage.tsx'
import { CatalogoPage } from '../pages/CatalogoPage.tsx'
import { CocinaPage } from '../pages/CocinaPage.tsx'
import { PedidoDetallePage } from '../pages/PedidoDetallePage.tsx'
import { PedidosPage } from '../pages/PedidosPage.tsx'
import { TurnosPage } from '../pages/TurnosPage.tsx'

export interface Acceso {
  path: string
  label: string
  /** Roles que pueden entrar. Es la única fuente de verdad: menú y rutas salen de aquí. */
  roles: RolNombre[]
  Page: ComponentType
  /** Pantallas internas que heredan los roles (por ejemplo, el detalle de un pedido). */
  hijas?: { path: string; Page: ComponentType }[]
}

export const ACCESOS: Acceso[] = [
  {
    path: '/pedidos',
    label: 'Pedidos',
    roles: ['Administrador', 'Cajero'],
    Page: PedidosPage,
    hijas: [{ path: '/pedidos/:id', Page: PedidoDetallePage }],
  },
  { path: '/turnos', label: 'Turnos', roles: ['Administrador', 'Cajero'], Page: TurnosPage },
  { path: '/cocina', label: 'Cocina', roles: ['Administrador', 'Pizzero'], Page: CocinaPage },
  {
    path: '/admin',
    label: 'Administración',
    roles: ['Administrador'],
    Page: AdminPage,
    hijas: [{ path: '/admin/catalogo', Page: CatalogoPage }],
  },
]

const INICIO: Record<RolNombre, string> = {
  Administrador: '/admin',
  Cajero: '/pedidos',
  Pizzero: '/cocina',
}

/** Pantalla a la que entra cada rol después de iniciar sesión. */
export function rutaInicial(rol: RolNombre | null): string {
  // Si el rol no está en la tabla, nunca se devuelve `undefined` (rompería <Navigate>).
  return (rol && Object.hasOwn(INICIO, rol) ? INICIO[rol] : null) ?? '/no-autorizado'
}