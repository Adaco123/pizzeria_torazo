import type { Ingrediente } from '../../api.ts'
import styles from './Pedidos.module.css'

interface Props {
  ingredientes: Ingrediente[]
  /** ingrediente_id → cantidad (solo los que tienen más de 0). */
  valor: Record<number, number>
  onChange: (siguiente: Record<number, number>) => void
  titulo?: string
}

export function ExtrasSelector({ ingredientes, valor, onChange, titulo = 'Extras (opcional)' }: Props) {
  if (ingredientes.length === 0) return null

  function cambiar(id: number, texto: string) {
    const cantidad = Math.max(0, Math.min(9, Number.parseInt(texto, 10) || 0))
    const siguiente = { ...valor }
    if (cantidad === 0) delete siguiente[id]
    else siguiente[id] = cantidad
    onChange(siguiente)
  }

  return (
    <details className={styles.extras}>
      <summary>{titulo}</summary>
      <div className={styles.extrasGrid}>
        {ingredientes.map((ingrediente) => (
          <label key={ingrediente.id} className={styles.extraItem}>
            <span>{ingrediente.nombre}</span>
            <input
              type="number"
              min="0"
              max="9"
              value={valor[ingrediente.id] ?? 0}
              onChange={(e) => cambiar(ingrediente.id, e.target.value)}
            />
          </label>
        ))}
      </div>
    </details>
  )
}