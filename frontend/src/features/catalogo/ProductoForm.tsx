import { useState, type SubmitEvent } from 'react'
import { productosApi } from '../../api.ts'
import type { Categoria, Producto } from '../../api.ts'
import { useToast } from '../../toast/toast-context.ts'
import { parseMonto } from '../../utils/formato.ts'
import { useAccion } from './useAccion.ts'
import styles from './Catalogo.module.css'

interface Props {
  categorias: Categoria[]
  /** Si se pasa, el formulario edita ese producto; si no, crea uno nuevo. */
  inicial?: Producto
  onGuardado: () => void
  onCancelar: () => void
}

export function ProductoForm({ categorias, inicial, onGuardado, onCancelar }: Props) {
  const toast = useToast()
  const { ocupado, ejecutar } = useAccion(onGuardado)
  const [nombre, setNombre] = useState(inicial?.nombre ?? '')
  const [descripcion, setDescripcion] = useState(inicial?.descripcion ?? '')
  const [precio, setPrecio] = useState(inicial ? String(inicial.precio_base) : '')
  const [categoriaId, setCategoriaId] = useState<number | null>(
    inicial?.categoria_id ?? categorias[0]?.id ?? null,
  )
  const [activo, setActivo] = useState(inicial?.activo ?? true)

  async function guardar(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    const limpio = nombre.trim()
    const precioBase = parseMonto(precio)

    if (!limpio) return toast.error('Escribe el nombre del producto')
    if (precioBase === null) return toast.error('El precio base debe ser un monto válido (0 o mayor)')
    if (categoriaId === null) return toast.error('Elige una categoría')

    const datos = {
      nombre: limpio,
      descripcion: descripcion.trim() || null,
      precio_base: precioBase,
      activo,
      categoria_id: categoriaId,
    }
    await ejecutar(
      () => (inicial ? productosApi.actualizar(inicial.id, datos) : productosApi.crear(datos)),
      inicial ? 'Producto actualizado' : `Producto «${limpio}» creado`,
    )
  }

  return (
    <section className={styles.card}>
      <h2>{inicial ? `Editar «${inicial.nombre}»` : 'Nuevo producto'}</h2>
      <form className={styles.form} onSubmit={guardar}>
        <label className={`${styles.field} ${styles.grow}`}>
          <span>Nombre</span>
          <input value={nombre} maxLength={100} onChange={(e) => setNombre(e.target.value)} />
        </label>

        <label className={styles.field}>
          <span>Categoría</span>
          <select value={categoriaId ?? ''} onChange={(e) => setCategoriaId(Number(e.target.value))}>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.field}>
          <span>Precio base (Bs)</span>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={precio}
            onChange={(e) => setPrecio(e.target.value)}
          />
        </label>

        <label className={`${styles.field} ${styles.grow}`}>
          <span>Descripción (opcional)</span>
          <input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
        </label>

        <label className={styles.check}>
          <input type="checkbox" checked={activo} onChange={(e) => setActivo(e.target.checked)} />
          Activo
        </label>

        <button className={styles.primary} type="submit" disabled={ocupado}>
          {ocupado ? 'Guardando…' : 'Guardar'}
        </button>
        <button className={styles.secondary} type="button" onClick={onCancelar}>
          Cancelar
        </button>
      </form>
      <p className={styles.muted}>
        El precio base se usa en productos sin tamaños (por ejemplo las bebidas). Si el producto
        tiene tamaños, se cobra el precio de cada tamaño.
      </p>
    </section>
  )
}