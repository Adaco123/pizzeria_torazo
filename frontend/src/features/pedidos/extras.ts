import type { Ingrediente, IngredienteTamano } from '../../apis/ingredientes.ts'

/**
 * Lo que cuesta una porción extra del ingrediente en ese tamaño.
 * En un producto normal, sin precio para el tamaño se cobra el precio extra base del ingrediente.
 * En mitad y mitad (`soloPorTamano`) el servidor solo cobra el precio configurado para el tamaño.
 */
export function precioExtra(
  ingrediente: Ingrediente,
  tamanoId: number | null,
  precios: IngredienteTamano[],
  soloPorTamano = false,
): number {
  const delTamano =
    tamanoId === null
      ? undefined
      : precios.find((p) => p.ingrediente_id === ingrediente.id && p.tamano_id === tamanoId)
  if (delTamano) return delTamano.precio_extra
  return soloPorTamano ? 0 : ingrediente.precio_extra
}

/** Total de los extras elegidos (ingrediente_id → cantidad). */
export function totalExtras(
  valor: Record<number, number>,
  ingredientes: Ingrediente[],
  tamanoId: number | null,
  precios: IngredienteTamano[],
  soloPorTamano = false,
): number {
  let suma = 0
  for (const ingrediente of ingredientes) {
    const cantidad = valor[ingrediente.id] ?? 0
    if (cantidad > 0) suma += cantidad * precioExtra(ingrediente, tamanoId, precios, soloPorTamano)
  }
  return Math.round(suma * 100) / 100
}
