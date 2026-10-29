import { useState, type SubmitEvent } from 'react'
import { tamanosApi } from '../../api.ts'
import type { Tamano } from '../../api.ts'
import { useToast } from '../../toast/toast-context.ts'
import { mensajeEliminar } from './errores.ts'
import { useAccion } from './useAccion.ts'
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
      <h2>Tamaños</h2>
      <p className={styles.muted}>
        Los tamaños se asignan a cada producto (con su precio) en la pestaña Productos, y a cada
        ingrediente en Ingredientes.
      </p>

      <form className={styles.form} onSubmit={crear}>
        <label className={`${styles.field} ${styles.grow}`}>
          <span>Nuevo tamaño</span>
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
              <th>Acciones</th>
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
                        className={styles.inlineInputWide}
                        value={textoEdicion}
                        maxLength={50}
                        autoFocus
                        onChange={(e) => setTextoEdicion(e.target.value)}
                      />
                    ) : (
                      tamano.nombre
                    )}
                  </td>
                  <td className={styles.acciones}>
                    {editando ? (
                      <>
                        <button className={styles.link} type="button" disabled={ocupado} onClick={() => renombrar(tamano)}>
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
                            setEditandoId(tamano.id)
                            setTextoEdicion(tamano.nombre)
                          }}
                        >
                          renombrar
                        </button>
                        <button className={styles.linkDanger} type="button" disabled={ocupado} onClick={() => eliminar(tamano)}>
                          eliminar
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              )
            })}
            {tamanos.length === 0 && (
              <tr>
                <td colSpan={2} className={styles.muted}>
                  Todavía no hay tamaños.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}