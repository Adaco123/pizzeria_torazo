import { Fragment, useState, type SubmitEvent } from 'react'
import { combosApi } from '../../api.ts'
import type { Combo } from '../../api.ts'
import { useToast } from '../../toast/toast-context.ts'
import { formatearMonto, parseMonto } from '../../utils/formato.ts'
import type { DatosCatalogo } from './useCatalogoAdmin.ts'
import { ComboProductos } from './ComboProductos.tsx'
import { mensajeEliminar } from './errores.ts'
import { useAccion } from './useAccion.ts'
import styles from './Catalogo.module.css'

interface Props {
  datos: DatosCatalogo
  recargar: () => void
}

export function CombosTab({ datos, recargar }: Props) {
  const toast = useToast()
  const { ocupado, ejecutar } = useAccion(recargar)
  const [nombre, setNombre] = useState('')
  const [precio, setPrecio] = useState('')
  const [abiertoId, setAbiertoId] = useState<number | null>(null)
  const [editando, setEditando] = useState<{ id: number; texto: string } | null>(null)

  async function crear(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    const limpio = nombre.trim()
    const precioCombo = parseMonto(precio)
    if (!limpio) return toast.error('Escribe el nombre del combo')
    if (precioCombo === null) return toast.error('El precio debe ser un monto válido (0 o mayor)')

    const resultado = await ejecutar(
      () => combosApi.crear({ nombre: limpio, precio: precioCombo, activo: true }),
      `Combo «${limpio}» creado: ahora agrégale sus productos`,
    )
    if (resultado) {
      setNombre('')
      setPrecio('')
      setAbiertoId(resultado.valor.id)
    }
  }

  async function cambiarPrecio(combo: Combo, texto: string) {
    const nuevo = parseMonto(texto)
    if (nuevo === null) return toast.error('El precio debe ser un monto válido (0 o mayor)')
    if (nuevo === combo.precio) {
      setEditando(null)
      return
    }
    const resultado = await ejecutar(() => combosApi.actualizar(combo.id, { precio: nuevo }), 'Precio actualizado')
    if (resultado) setEditando(null)
  }

  async function eliminar(combo: Combo) {
    if (!window.confirm(`¿Eliminar el combo «${combo.nombre}»?`)) return
    await ejecutar(
      () => combosApi.eliminar(combo.id),
      'Combo eliminado',
      (e) => mensajeEliminar(e, combo.nombre),
    )
  }

  return (
    <section className={styles.card}>
      <h2>Combos</h2>

      <form className={styles.form} onSubmit={crear}>
        <label className={`${styles.field} ${styles.grow}`}>
          <span>Nuevo combo</span>
          <input value={nombre} maxLength={100} onChange={(e) => setNombre(e.target.value)} />
        </label>
        <label className={styles.field}>
          <span>Precio (Bs)</span>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={precio}
            onChange={(e) => setPrecio(e.target.value)}
          />
        </label>
        <button className={styles.primary} type="submit" disabled={ocupado}>
          Crear
        </button>
      </form>
      <p className={styles.muted}>Del combo solo se puede cambiar después el precio y si está activo.</p>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Combo</th>
              <th className={styles.num}>Precio</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {datos.combos.map((combo) => {
              const enEdicion = editando?.id === combo.id
              return (
                <Fragment key={combo.id}>
                  <tr className={combo.activo ? undefined : styles.inactiva}>
                    <td>{combo.nombre}</td>
                    <td className={styles.num}>
                      {enEdicion ? (
                        <input
                          className={styles.inlineInput}
                          type="number"
                          inputMode="decimal"
                          min="0"
                          step="0.01"
                          autoFocus
                          value={editando.texto}
                          onChange={(e) => setEditando({ id: combo.id, texto: e.target.value })}
                        />
                      ) : (
                        formatearMonto(combo.precio)
                      )}
                    </td>
                    <td>
                      <span className={combo.activo ? `${styles.badge} ${styles.badgeOn}` : `${styles.badge} ${styles.badgeOff}`}>
                        {combo.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className={styles.acciones}>
                      {enEdicion ? (
                        <>
                          <button className={styles.link} type="button" disabled={ocupado} onClick={() => cambiarPrecio(combo, editando.texto)}>
                            guardar
                          </button>
                          <button className={styles.link} type="button" onClick={() => setEditando(null)}>
                            cancelar
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            className={styles.link}
                            type="button"
                            aria-expanded={abiertoId === combo.id}
                            onClick={() => setAbiertoId(abiertoId === combo.id ? null : combo.id)}
                          >
                            {abiertoId === combo.id ? 'ocultar productos' : 'productos'}
                          </button>
                          <button
                            className={styles.link}
                            type="button"
                            onClick={() => setEditando({ id: combo.id, texto: String(combo.precio) })}
                          >
                            cambiar precio
                          </button>
                          <button
                            className={styles.link}
                            type="button"
                            disabled={ocupado}
                            onClick={() =>
                              ejecutar(
                                () => combosApi.toggleActivo(combo.id),
                                combo.activo ? 'Combo desactivado' : 'Combo activado',
                              )
                            }
                          >
                            {combo.activo ? 'desactivar' : 'activar'}
                          </button>
                          <button className={styles.linkDanger} type="button" disabled={ocupado} onClick={() => eliminar(combo)}>
                            eliminar
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                  {abiertoId === combo.id && (
                    <tr>
                      <td colSpan={4} style={{ padding: 0 }}>
                        <ComboProductos combo={combo} productos={datos.productos} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
            {datos.combos.length === 0 && (
              <tr>
                <td colSpan={4} className={styles.muted}>
                  Todavía no hay combos.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}