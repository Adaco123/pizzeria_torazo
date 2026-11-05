import { Check, Pencil, Plus, Ruler, Trash2, X } from 'lucide-react'
import { useState, type SubmitEvent } from 'react'
import { tamanosApi } from '../../apis/tamanos.ts'
import type { Tamano } from '../../apis/tamanos.ts'
import { useToast } from '../../toast/toast-context.ts'
import { mensajeEliminar } from './errores.ts'
import { useAccion } from './useAccion.ts'
import { Acciones, BotonIcono, Cabeza, Vacio } from '../admin/ui.tsx'
import ui from '../admin/Ui.module.css'
import styles from './Catalogo.module.css'

interface Props {
  tamanos: Tamano[]
  recargar: () => void
}

export function TamanosTab({ tamanos, recargar }: Props) {
  const toast = useToast()
  const { ocupado, ejecutar } = useAccion(recargar)
  const [nombre, setNombre] = useState('')
  const [editandoId, setEditandoId] = useState<number | null>(null)
  const [textoEdicion, setTextoEdicion] = useState('')

  async function crear(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    const limpio = nombre.trim()
    if (!limpio) return toast.error('Escribe el nombre del tamaño')
    const resultado = await ejecutar(() => tamanosApi.crear({ nombre: limpio }), `Tamaño «${limpio}» creado`)
    if (resultado) setNombre('')
  }

  async function renombrar(tamano: Tamano) {
    const limpio = textoEdicion.trim()
    if (!limpio) return toast.error('El nombre no puede estar vacío')
    const resultado = await ejecutar(
      () => tamanosApi.actualizar(tamano.id, { nombre: limpio }),
      'Tamaño renombrado',
    )
    if (resultado) setEditandoId(null)
  }

  async function eliminar(tamano: Tamano) {
    if (!window.confirm(`¿Eliminar el tamaño «${tamano.nombre}»?`)) return
    await ejecutar(
      () => tamanosApi.eliminar(tamano.id),
      'Tamaño eliminado',
      (e) => mensajeEliminar(e, tamano.nombre),
    )
  }

  return (
    <section className={styles.card}>
      <Cabeza icono={Ruler} titulo="Tamaños" cuenta={tamanos.length} />
      <p className={styles.muted}>
        Los tamaños se asignan a cada producto (con su precio) en la pestaña Productos, y a cada
        ingrediente en Ingredientes.
      </p>

      <form className={styles.form} onSubmit={crear}>
        <label className={`${styles.field} ${styles.grow}`}>
          <span>Nuevo tamaño</span>
          <input value={nombre} maxLength={50} onChange={(e) => setNombre(e.target.value)} />
        </label>
        <button className={`${ui.btn} ${ui.primario}`} type="submit" disabled={ocupado}>
          <Plus size={16} aria-hidden="true" /> Crear
        </button>
      </form>

      {tamanos.length === 0 ? (
        <Vacio icono={Ruler} titulo="Todavía no hay tamaños" detalle="Crea el primero, por ejemplo «Personal»." />
      ) : (
        <div className={ui.tw}>
          <table className={ui.tabla}>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>
                  <span className={ui.soloLector}>Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {tamanos.map((tamano) => {
                const editando = editandoId === tamano.id
                return (
                  <tr key={tamano.id}>
                    <td>
                      {editando ? (
                        <input
                          className={ui.edicion}
                          aria-label="Nombre del tamaño"
                          value={textoEdicion}
                          maxLength={50}
                          autoFocus
                          onChange={(e) => setTextoEdicion(e.target.value)}
                        />
                      ) : (
                        <b>{tamano.nombre}</b>
                      )}
                    </td>
                    <td className={ui.acciones}>
                      <Acciones>
                        {editando ? (
                          <>
                            <BotonIcono icono={Check} titulo="Guardar" tono="ok" disabled={ocupado} onClick={() => renombrar(tamano)} />
                            <BotonIcono icono={X} titulo="Cancelar" onClick={() => setEditandoId(null)} />
                          </>
                        ) : (
                          <>
                            <BotonIcono
                              icono={Pencil}
                              titulo={`Renombrar «${tamano.nombre}»`}
                              onClick={() => {
                                setEditandoId(tamano.id)
                                setTextoEdicion(tamano.nombre)
                              }}
                            />
                            <BotonIcono icono={Trash2} titulo={`Eliminar «${tamano.nombre}»`} tono="peligro" disabled={ocupado} onClick={() => void eliminar(tamano)} />
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
