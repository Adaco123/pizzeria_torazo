import { useState, type SubmitEvent } from 'react'
import { categoriasApi } from '../../api.ts'
import type { Categoria, Producto } from '../../api.ts'
import { useToast } from '../../toast/toast-context.ts'
import { mensajeEliminar } from './errores.ts'
import { useAccion } from './useAccion.ts'
import styles from './Catalogo.module.css'

interface Props {
  categorias: Categoria[]
  productos: Producto[]
  recargar: () => void
}

export function CategoriasTab({ categorias, productos, recargar }: Props) {
  const toast = useToast()
  const { ocupado, ejecutar } = useAccion(recargar)
  const [nombre, setNombre] = useState('')
  const [editandoId, setEditandoId] = useState<number | null>(null)
  const [textoEdicion, setTextoEdicion] = useState('')

  const cantidadDe = (id: number) => productos.filter((p) => p.categoria_id === id).length

  async function crear(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    const limpio = nombre.trim()
    if (!limpio) return toast.error('Escribe el nombre de la categoría')
    const resultado = await ejecutar(
      () => categoriasApi.crear({ nombre: limpio, activo: true }),
      `Categoría «${limpio}» creada`,
    )
    if (resultado) setNombre('')
  }

  async function renombrar(categoria: Categoria) {
    const limpio = textoEdicion.trim()
    if (!limpio) return toast.error('El nombre no puede estar vacío')
    // El backend rechaza reenviar el mismo nombre ("ya existe"), así que no se envía si no cambió.
    if (limpio === categoria.nombre) {
      setEditandoId(null)
      return
    }
    const resultado = await ejecutar(
      () => categoriasApi.actualizar(categoria.id, { nombre: limpio }),
      'Categoría renombrada',
    )
    if (resultado) setEditandoId(null)
  }

  async function eliminar(categoria: Categoria) {
    if (!window.confirm(`¿Eliminar la categoría «${categoria.nombre}»?`)) return
    await ejecutar(
      () => categoriasApi.eliminar(categoria.id),
      'Categoría eliminada',
      (e) => mensajeEliminar(e, categoria.nombre),
    )
  }

  return (
    <section className={styles.card}>
      <h2>Categorías</h2>

      <form className={styles.form} onSubmit={crear}>
        <label className={`${styles.field} ${styles.grow}`}>
          <span>Nueva categoría</span>
          <input value={nombre} maxLength={50} onChange={(e) => setNombre(e.target.value)} />
        </label>
        <button className={styles.primary} type="submit" disabled={ocupado}>
          Crear
        </button>
      </form>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Nombre</th>
              <th className={styles.num}>Productos</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {categorias.map((categoria) => {
              const cantidad = cantidadDe(categoria.id)
              const editando = editandoId === categoria.id
              return (
                <tr key={categoria.id} className={categoria.activo ? undefined : styles.inactiva}>
                  <td>
                    {editando ? (
                      <input
                        className={styles.inlineInputWide}
                        value={textoEdicion}
                        maxLength={50}
                        autoFocus
                        onChange={(e) => setTextoEdicion(e.target.value)}
                      />
                    ) : (
                      categoria.nombre
                    )}
                  </td>
                  <td className={styles.num}>{cantidad}</td>
                  <td>
                    <span className={categoria.activo ? `${styles.badge} ${styles.badgeOn}` : `${styles.badge} ${styles.badgeOff}`}>
                      {categoria.activo ? 'Activa' : 'Inactiva'}
                    </span>
                  </td>
                  <td className={styles.acciones}>
                    {editando ? (
                      <>
                        <button className={styles.link} type="button" disabled={ocupado} onClick={() => renombrar(categoria)}>
                          guardar
                        </button>
                        <button className={styles.link} type="button" onClick={() => setEditandoId(null)}>
                          cancelar
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          className={styles.link}
                          type="button"
                          onClick={() => {
                            setEditandoId(categoria.id)
                            setTextoEdicion(categoria.nombre)
                          }}
                        >
                          renombrar
                        </button>
                        <button
                          className={styles.link}
                          type="button"
                          disabled={ocupado}
                          onClick={() =>
                            ejecutar(
                              () => categoriasApi.toggleActivo(categoria.id),
                              categoria.activo ? 'Categoría desactivada' : 'Categoría activada',
                            )
                          }
                        >
                          {categoria.activo ? 'desactivar' : 'activar'}
                        </button>
                        <button
                          className={styles.linkDanger}
                          type="button"
                          disabled={ocupado || cantidad > 0}
                          title={cantidad > 0 ? 'Tiene productos: muévelos o desactiva la categoría' : undefined}
                          onClick={() => eliminar(categoria)}
                        >
                          eliminar
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              )
            })}
            {categorias.length === 0 && (
              <tr>
                <td colSpan={4} className={styles.muted}>
                  Todavía no hay categorías.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}