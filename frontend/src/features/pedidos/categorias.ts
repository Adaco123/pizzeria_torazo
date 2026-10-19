import type { Categoria } from '../../api.ts'

/**
 * La categoría de las pizzas. Solo sus productos se pueden pedir mitad y mitad.
 * Se reconoce por el nombre, igual que hace el backend, no por su id.
 */
export function esCategoriaPizzas(categoria: Pick<Categoria, 'nombre'>): boolean {
  const nombre = categoria.nombre.trim().toLowerCase()
  return nombre === 'pizza' || nombre === 'pizzas'
}
