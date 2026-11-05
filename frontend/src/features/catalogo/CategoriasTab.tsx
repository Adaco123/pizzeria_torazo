import { Check, Layers, Pencil, Plus, Power, Trash2, X } from 'lucide-react'
import { useState, type SubmitEvent } from 'react'
import { categoriasApi } from '../../apis/categorias.ts'
import type { Categoria } from '../../apis/categorias.ts'
import type { Producto } from '../../apis/productos.ts'
import { useToast } from '../../toast/toast-context.ts'
import { mensajeEliminar } from './errores.ts'
import { useAccion } from './useAccion.ts'
import { Acciones, BotonIcono, Cabeza, EstadoPildora, Vacio } from '../admin/ui.tsx'
import ui from '../admin/Ui.module.css'
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
      <Cabeza icono={Layers} titulo="Categorías" cuenta={categorias.length} />

      <form className={styles.form} onSubmit={crear}>
        <label className={`${styles.field} ${styles.grow}`}>
          <span>Nueva categoría</span>
          <input value={nombre} maxLength={50} onChange={(e) => setNombre(e.target.value)} />
        </label>
        <button className={`${ui.btn} ${ui.primario}`} type="submit" disabled={ocupado}>
          <Plus size={16} aria-hidden="true" /> Crear
        </button>
      </form>

      {categorias.length === 0 ? (
        <Vacio icono={Layers} titulo="Todavía no hay categorías" detalle="Crea la primera para poder agregar productos." />
      ) : (
        <div className={ui.tw}>
          <table className={ui.tabla}>
            <thead>
              <tr>
                <th>Nombre</th>
                <th className={ui.num}>Productos</th>
                <th>Estado</th>
                <th>
                  <span className={ui.soloLector}>Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {categorias.map((categoria) => {
                const cantidad = cantidadDe(categoria.id)
                const editando = editandoId === categoria.id
                return (
                  <tr key={categoria.id} className={categoria.activo ? undefined : ui.inactiva}>
                    <td>
                      {editando ? (
                        <input
                          className={ui.edicion}
                          aria-label="Nombre de la categoría"
                          value={textoEdicion}
                          maxLength={50}
                          autoFocus
                          onChange={(e) => setTextoEdicion(e.target.value)}
                        />
                      ) : (
                        <b>{categoria.nombre}</b>
                      )}
                    </td>
                    <td className={ui.num}>{cantidad}</td>
                    <td>
                      <EstadoPildora activo={categoria.activo} on="Activa" off="Inactiva" />
                    </td>
                    <td className={ui.acciones}>
                      <Acciones>
                        {editando ? (
                          <>
                            <BotonIcono icono={Check} titulo="Guardar" tono="ok" disabled={ocupado} onClick={() => renombrar(categoria)} />
                            <BotonIcono icono={X} titulo="Cancelar" onClick={() => setEditandoId(null)} />
                          </>
                        ) : (
                          <>
                            <BotonIcono
                              icono={Pencil}
                              titulo={`Renombrar «${categoria.nombre}»`}
                              onClick={() => {
                                setEditandoId(categoria.id)
                                setTextoEdicion(categoria.nombre)
                              }}
                            />
                            <BotonIcono
                              icono={Power}
                              titulo={categoria.activo ? `Desactivar «${categoria.nombre}»` : `Activar «${categoria.nombre}»`}
                              tono={categoria.activo ? 'ok' : 'off'}
                              disabled={ocupado}
                              onClick={() =>
                                void ejecutar(
                                  () => categoriasApi.toggleActivo(categoria.id),
                                  categoria.activo ? 'Categoría desactivada' : 'Categoría activada',
                                )
                              }
                            />
                            <BotonIcono
                              icono={Trash2}
                              titulo={cantidad > 0 ? 'Tiene productos: muévelos o desactiva la categoría' : `Eliminar «${categoria.nombre}»`}
                              tono="peligro"
                              disabled={ocupado || cantidad > 0}
                              onClick={() => void eliminar(categoria)}
                            />
                          </>
                        )}
                      </Acciones>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
