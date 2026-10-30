import type { Ingrediente, IngredienteTamano } from '../../apis/ingredientes.ts'
import { formatearMonto } from '../../utils/formato.ts'
import { precioExtra } from './extras.ts'
import styles from './Pedidos.module.css'

const MAXIMO = 9

interface Props {
  ingredientes: Ingrediente[]
  /** ingrediente_id → cantidad (solo los que tienen más de 0). */
  valor: Record<number, number>
  onChange: (siguiente: Record<number, number>) => void
  titulo?: string
  /** Tamaño elegido y precios por tamaño, para mostrar cuánto cuesta cada extra. */
  tamanoId?: number | null
  precios?: IngredienteTamano[]
  soloPorTamano?: boolean
}

export function ExtrasSelector({
  ingredientes,
  valor,
  onChange,
  titulo = 'Extras (opcional)',
  tamanoId = null,
  precios = [],
  soloPorTamano = false,
}: Props) {
  if (ingredientes.length === 0) return null

  function fijar(id: number, cantidad: number) {
    const limitada = Math.max(0, Math.min(MAXIMO, cantidad))
    const siguiente = { ...valor }
    if (limitada === 0) delete siguiente[id]
    else siguiente[id] = limitada
    onChange(siguiente)
  }

  const elegidos = Object.keys(valor).length

  return (
    <details className={styles.extras}>
      <summary>
        {titulo}
        {elegidos > 0 && ` · ${elegidos} elegido${elegidos === 1 ? '' : 's'}`}
      </summary>
      <p className={styles.muted}>Cada número es cuántas porciones extra lleva (máximo {MAXIMO}).</p>
      <div className={styles.extrasGrid}>
        {ingredientes.map((ingrediente) => {
          const cantidad = valor[ingrediente.id] ?? 0
          return (
            <div
              key={ingrediente.id}
              className={cantidad > 0 ? `${styles.extraItem} ${styles.extraActivo}` : styles.extraItem}
            >
              <div className={styles.extraNombre}>
                <span>{ingrediente.nombre}</span>
                <small>+ {formatearMonto(precioExtra(ingrediente, tamanoId, precios, soloPorTamano))}</small>
              </div>
              <div className={styles.contadorExtra}>
                <button
                  type="button"
                  aria-label={`Quitar ${ingrediente.nombre}`}
                  disabled={cantidad === 0}
                  onClick={() => fijar(ingrediente.id, cantidad - 1)}
                >
                  −
                </button>
                <output aria-label={`${ingrediente.nombre}: ${cantidad}`}>{cantidad}</output>
                <button
                  type="button"
                  aria-label={`Agregar ${ingrediente.nombre}`}
                  disabled={cantidad >= MAXIMO}
                  onClick={() => fijar(ingrediente.id, cantidad + 1)}
                >
                  +
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </details>
  )
}
