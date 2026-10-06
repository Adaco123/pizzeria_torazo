import { useState, type SubmitEvent } from 'react'
import { pedidosApi } from '../../api.ts'
import { useToast } from '../../toast/toast-context.ts'
import { formatearMonto } from '../../utils/formato.ts'
import type { Catalogo } from './useCatalogo.ts'
import styles from './Pedidos.module.css'

interface Props {
  pedidoId: number
  catalogo: Catalogo
  onAgregado: () => void
}

export function AgregarCombo({ pedidoId, catalogo, onAgregado }: Props) {
  const toast = useToast()
  const combos = catalogo.combos.filter((c) => c.activo)
  const [comboId, setComboId] = useState<number | null>(null)
  const [cantidad, setCantidad] = useState('1')
  const [notas, setNotas] = useState('')
  const [enviando, setEnviando] = useState(false)

  const combo = combos.find((c) => c.id === comboId) ?? null
  const unidades = Number.parseInt(cantidad, 10)
  const cantidadValida = Number.isInteger(unidades) && unidades >= 1

  async function agregar(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!combo) return toast.error('Elige un combo')
    if (!cantidadValida) return toast.error('La cantidad debe ser 1 o más')

    setEnviando(true)
    try {
      // El precio del combo lo pone el backend.
      await pedidosApi.agregarDetalle(pedidoId, {
        combo_id: combo.id,
        cantidad: unidades,
        notas: notas.trim() || null,
      })
      toast.exito(`${combo.nombre} agregado`)
      setComboId(null)
      setCantidad('1')
      setNotas('')
      onAgregado()
    } catch (e) {
      toast.error(e)
    } finally {
      setEnviando(false)
    }
  }

  if (combos.length === 0) return <p className={styles.muted}>No hay combos activos.</p>

  return (
    <form className={styles.formStack} onSubmit={agregar}>
      <div className={styles.productGrid}>
        {combos.map((c) => (
          <button
            key={c.id}
            type="button"
            className={c.id === comboId ? styles.productActive : styles.product}
            aria-pressed={c.id === comboId}
            onClick={() => setComboId(c.id)}
          >
            {c.nombre}
            <small>{formatearMonto(c.precio)}</small>
          </button>
        ))}
      </div>

      <div className={styles.formRow}>
        <label className={styles.field}>
          <span>Cantidad</span>
          <input
            type="number"
            min="1"
            step="1"
            value={cantidad}
            onChange={(e) => setCantidad(e.target.value)}
          />
        </label>
        <label className={`${styles.field} ${styles.grow}`}>
          <span>Notas (opcional)</span>
          <input type="text" value={notas} onChange={(e) => setNotas(e.target.value)} />
        </label>
      </div>

      <div className={styles.formRow}>
        <button className={styles.primary} type="submit" disabled={enviando || !combo}>
          {enviando ? 'Agregando…' : 'Agregar al pedido'}
        </button>
        {combo && cantidadValida && (
          <span className={styles.muted}>{formatearMonto(combo.precio * unidades)}</span>
        )}
      </div>
    </form>
  )
}