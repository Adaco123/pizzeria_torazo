import { BookOpen, Bike, ChartColumn, CircleDot, House, Users, type LucideIcon } from 'lucide-react'

export interface SeccionAdmin {
  path: string
  label: string
  /** Una línea corta para el riel. */
  corta: string
  /** Para qué sirve; es el texto de la tarjeta en el inicio. */
  resumen: string
  icono: LucideIcon
}

/** Pantalla de inicio del panel: no es una sección más, solo la entrada al riel. */
export const INICIO_ADMIN = { path: '/admin', label: 'Inicio', corta: 'Resumen de secciones', icono: House } as const

/** Las secciones del panel. El riel y las tarjetas del inicio salen de esta lista. */
export const SECCIONES_ADMIN: SeccionAdmin[] = [
  {
    path: '/admin/catalogo',
    label: 'Catálogo',
    corta: 'Productos, precios y combos',
    resumen: 'Productos con sus tamaños y precios, categorías, ingredientes y combos.',
    icono: BookOpen,
  },
  {
    path: '/admin/usuarios',
    label: 'Usuarios',
    corta: 'Cuentas, roles y accesos',
    resumen: 'Crear cuentas, cambiar roles, desactivar a quien ya no trabaja y restablecer contraseñas.',
    icono: Users,
  },
  {
    path: '/admin/repartidores',
    label: 'Repartidores',
    corta: 'Delivery y envíos',
    resumen: 'Personas o empresas que llevan los domicilios. El costo de envío lo escribe el cajero al cobrar.',
    icono: Bike,
  },
  {
    path: '/admin/mesas',
    label: 'Mesas',
    corta: 'Plano y disponibilidad',
    resumen: 'Las mesas del local. Los meseros las abren y toman los pedidos; la cuenta se cobra una sola vez en caja.',
    icono: CircleDot,
  },
  {
    path: '/admin/reportes',
    label: 'Reportes',
    corta: 'Ventas y cancelaciones',
    resumen:
      'Ventas por día, por método de pago y por producto, los mejores clientes, los envíos y las cancelaciones con devolución.',
    icono: ChartColumn,
  },
]
