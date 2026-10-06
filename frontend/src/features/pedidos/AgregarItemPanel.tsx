import { useState } from 'react'
import type { Catalogo } from './useCatalogo.ts'
import { AgregarCombo } from './AgregarCombo.tsx'
import { AgregarMitad } from './AgregarMitad.tsx'
import { AgregarProducto } from './AgregarProducto.tsx'
import styles from './Pedidos.module.css'

type Pestana = 'producto' | 'mitad' | 'combo'

const PESTANAS: { id: Pestana; label: string }[] = [
  { id: 'producto', label: 'Producto' },
  { id: 'mitad', label: 'Mitad y mitad' },
  { id: 'combo', label: 'Combo' },
]

interface Props {
  pedidoId: number
  catalogo: Catalogo
  onAgregado: () => void
}

export function AgregarItemPanel({ pedidoId, catalogo, onAgregado }: Props) {
  const [pestana, setPestana] = useState<Pestana>('producto')

  return (
    <section className={styles.card}>
      <h2>Agregar al pedido</h2>

      <div className={styles.tabs} role="tablist">
        {PESTANAS.map((p) => (
          <button
            key={p.id}
            type="button"
            role="tab"
            aria-selected={p.id === pestana}
            className={p.id === pestana ? styles.tabActive : styles.tab}
            onClick={() => setPestana(p.id)}
          >
            {p.label}
          </button>
        ))}
      </div>

      {pestana === 'producto' && (
        <AgregarProducto pedidoId={pedidoId} catalogo={catalogo} onAgregado={onAgregado} />
      )}
      {pestana === 'mitad' && (
        <AgregarMitad pedidoId={pedidoId} catalogo={catalogo} onAgregado={onAgregado} />
      )}
      {pestana === 'combo' && (
        <AgregarCombo pedidoId={pedidoId} catalogo={catalogo} onAgregado={onAgregado} />
      )}
    </section>
  )
}