import type { ComponentType } from 'react'
import type { RolNombre } from '../api.ts'
import { AdminPage } from '../pages/AdminPage.tsx'
import { CatalogoPage } from '../pages/CatalogoPage.tsx'
import { CuentaMesaPage } from '../pages/CuentaMesaPage.tsx'
import { MesasAdminPage } from '../pages/MesasAdminPage.tsx'
import { MesasPage } from '../pages/MesasPage.tsx'
import { CocinaPage } from '../pages/CocinaPage.tsx'
import { PedidoDetallePage } from '../pages/PedidoDetallePage.tsx'
import { CuentaPage } from '../pages/CuentaPage.tsx'
import { PedidosPage } from '../pages/PedidosPage.tsx'
import { RepartidoresPage } from '../pages/RepartidoresPage.tsx'
import { ReportesPage } from '../pages/ReportesPage.tsx'
import { TurnosPage } from '../pages/TurnosPage.tsx'
import { UsuariosPage } from '../pages/UsuariosPage.tsx'

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
  {
    path: '/mesas',
    label: 'Mesas',
    roles: ['Administrador', 'Cajero', 'Mesero'],
    Page: MesasPage,
    hijas: [{ path: '/mesas/:id', Page: CuentaMesaPage }],
  },
  { path: '/turnos', label: 'Turnos', roles: ['Administrador', 'Cajero'], Page: TurnosPage },
  { path: '/cocina', label: 'Cocina', roles: ['Administrador', 'Pizzero'], Page: CocinaPage },
  {
    path: '/admin',
    label: 'Administración',
    roles: ['Administrador'],
    Page: AdminPage,
    hijas: [
      { path: '/admin/catalogo', Page: CatalogoPage },
      { path: '/admin/usuarios', Page: UsuariosPage },
      { path: '/admin/repartidores', Page: RepartidoresPage },
      { path: '/admin/mesas', Page: MesasAdminPage },
      { path: '/admin/reportes', Page: ReportesPage },
    ],
  },
  // Cada usuario cambia su propia contraseña, sea cual sea su rol.
  { path: '/cuenta', label: 'Mi cuenta', roles: ['Administrador', 'Cajero', 'Pizzero', 'Mesero'], Page: CuentaPage },
]

const INICIO: Record<RolNombre, string> = {
  Administrador: '/admin',
  Cajero: '/pedidos',
  Pizzero: '/cocina',
  Mesero: '/mesas',
}

/** Pantalla a la que entra cada rol después de iniciar sesión. */
export function rutaInicial(rol: RolNombre | null): string {
  // Si el rol no está en la tabla, nunca se devuelve `undefined` (rompería <Navigate>).
  return (rol && Object.hasOwn(INICIO, rol) ? INICIO[rol] : null) ?? '/no-autorizado'
}