import { useState, type SubmitEvent } from 'react'
import { pedidosApi } from '../../api.ts'
import type { DetalleMitadInput } from '../../api.ts'
import { useToast } from '../../toast/toast-context.ts'
import type { Catalogo } from './useCatalogo.ts'
import { ExtrasSelector } from './ExtrasSelector.tsx'
import styles from './Pedidos.module.css'

interface Props {
  pedidoId: number
  catalogo: Catalogo
  onAgregado: () => void
}

function aExtras(valor: Record<number, number>) {
  return Object.entries(valor).map(([id, cantidad]) => ({
    ingrediente_id: Number(id),
    cantidad,
  }))
}

export function AgregarMitad({ pedidoId, catalogo, onAgregado }: Props) {
  const toast = useToast()
  const categorias = catalogo.categorias.filter((c) => c.activo)
  const ingredientes = catalogo.ingredientes.filter((i) => i.activo)

  // Por defecto, la categoría de pizzas si existe.
  const [categoriaId, setCategoriaId] = useState<number | null>(
    (categorias.find((c) => /pizza/i.test(c.nombre)) ?? categorias[0])?.id ?? null,
  )
  const [tamanoId, setTamanoId] = useState<number | null>(null)
  const [mitad1, setMitad1] = useState<number | null>(null)
  const [mitad2, setMitad2] = useState<number | null>(null)
  const [extras1, setExtras1] = useState<Record<number, number>>({})
  const [extras2, setExtras2] = useState<Record<number, number>>({})
  const [cantidad, setCantidad] = useState('1')
  const [notas, setNotas] = useState('')
  const [enviando, setEnviando] = useState(false)

  const productos = catalogo.productos.filter((p) => p.activo && p.categoria_id === categoriaId)
  const unidades = Number.parseInt(cantidad, 10)

  function elegir(setter: (id: number | null) => void, valor: string) {
    setter(valor === '' ? null : Number(valor))
  }

  async function agregar(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()

    if (tamanoId === null) return toast.error('Elige el tamaño de la pizza')
    if (mitad1 === null || mitad2 === null) return toast.error('Elige los dos sabores')
    if (mitad1 === mitad2) return toast.error('Elige dos sabores distintos')
    if (!Number.isInteger(unidades) || unidades < 1) return toast.error('La cantidad debe ser 1 o más')

    const mitades: [DetalleMitadInput, DetalleMitadInput] = [
      { mitad: 1, producto_id: mitad1, extras: aExtras(extras1) },
      { mitad: 2, producto_id: mitad2, extras: aExtras(extras2) },
    ]

    setEnviando(true)
    try {
      await pedidosApi.agregarDetalleMitad(pedidoId, {
        tamano_id: tamanoId,
        cantidad: unidades,
        notas: notas.trim() || null,
        mitades,
      })
      toast.exito('Pizza mitad y mitad agregada')
      setMitad1(null)
      setMitad2(null)
      setExtras1({})
      setExtras2({})
      setCantidad('1')
      setNotas('')
      onAgregado()
    } catch (e) {
      toast.error(e)
    } finally {
      setEnviando(false)
    }
  }

  if (categorias.length === 0) return <p className={styles.muted}>No hay categorías activas.</p>

  return (
    <form className={styles.formStack} onSubmit={agregar}>
      <p className={styles.muted}>
        El precio lo calcula el sistema: el de la mitad más cara según el tamaño.
      </p>

      <div className={styles.formRow}>
        <label className={styles.field}>
          <span>Categoría</span>
          <select
            value={categoriaId ?? ''}
            onChange={(e) => {
              elegir(setCategoriaId, e.target.value)
              setMitad1(null)
              setMitad2(null)
            }}
          >
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.field}>
          <span>Tamaño</span>
          <select value={tamanoId ?? ''} onChange={(e) => elegir(setTamanoId, e.target.value)}>
            <option value="">Elegir…</option>
            {catalogo.tamanos.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nombre}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className={styles.formRow}>
        <div className={`${styles.formStack} ${styles.grow}`}>
          <label className={styles.field}>
            <span>½ Primer sabor</span>
            <select value={mitad1 ?? ''} onChange={(e) => elegir(setMitad1, e.target.value)}>
              <option value="">Elegir…</option>
              {productos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </label>
          <ExtrasSelector
            ingredientes={ingredientes}
            valor={extras1}
            onChange={setExtras1}
            titulo="Extras del primer sabor"
          />
        </div>

        <div className={`${styles.formStack} ${styles.grow}`}>
          <label className={styles.field}>
            <span>½ Segundo sabor</span>
            <select value={mitad2 ?? ''} onChange={(e) => elegir(setMitad2, e.target.value)}>
              <option value="">Elegir…</option>
              {productos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </label>
          <ExtrasSelector
            ingredientes={ingredientes}
            valor={extras2}
            onChange={setExtras2}
            titulo="Extras del segundo sabor"
          />
        </div>
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
        <button className={styles.primary} type="submit" disabled={enviando}>
          {enviando ? 'Agregando…' : 'Agregar al pedido'}
        </button>
      </div>
    </form>
  )
}