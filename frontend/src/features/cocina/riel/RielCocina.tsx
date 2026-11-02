import type { Pedido } from '../../../apis/pedidos.ts'
import { FilaCocina } from './FilaCocina.tsx'
import styles from './Riel.module.css'

interface Props {
  porPreparar: Pedido[]
  enPreparacion: Pedido[]
  elegidoId: number | null
  ahora: number
  onElegir: (pedidoId: number) => void
}

/** Lista de pedidos de la izquierda: primero lo que ya está en el horno, luego lo que falta por empezar. */
export function RielCocina({ porPreparar, enPreparacion, elegidoId, ahora, onElegir }: Props) {
  const grupo = (titulo: string, lista: Pedido[], vacio: string) => (
    <section aria-label={titulo}>
      <h3 className={styles.seccion}>
        {titulo}
        <span className={styles.contador}>{lista.length}</span>
      </h3>
      {lista.length === 0 ? (
        <p className={styles.vacio}>{vacio}</p>
      ) : (
        <ul className={styles.lista}>
          {lista.map((pedido) => (
            <FilaCocina key={pedido.id} pedido={pedido} ahora={ahora} elegida={pedido.id === elegidoId} onElegir={() => onElegir(pedido.id)} />
          ))}
        </ul>
      )}
    </section>
  )

  return (
    <aside className={styles.riel} aria-label="Pedidos de cocina">
      <h2>Pedidos</h2>
      {grupo('En preparación', enPreparacion, 'Nada en el horno')}
      {grupo('Por empezar', porPreparar, 'Sin pedidos nuevos')}
    </aside>
  )
}
