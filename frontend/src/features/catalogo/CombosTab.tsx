import { Check, Package, PackageOpen, Pencil, Plus, Power, Trash2, X } from 'lucide-react'
import { Fragment, useState, type SubmitEvent } from 'react'
import { combosApi } from '../../apis/combos.ts'
import type { Combo } from '../../apis/combos.ts'
import { useToast } from '../../toast/toast-context.ts'
import { formatearMonto, parseMonto } from '../../utils/formato.ts'
import type { DatosCatalogo } from './useCatalogoAdmin.ts'
import { ComboProductos } from './ComboProductos.tsx'
import { mensajeEliminar } from './errores.ts'
import { useAccion } from './useAccion.ts'
import { Acciones, BotonIcono, Cabeza, EstadoPildora, Vacio } from '../admin/ui.tsx'
import ui from '../admin/Ui.module.css'
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
      <Cabeza icono={Package} titulo="Combos" cuenta={datos.combos.length} />

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
        <button className={`${ui.btn} ${ui.primario}`} type="submit" disabled={ocupado}>
          <Plus size={16} aria-hidden="true" /> Crear
        </button>
      </form>
      <p className={styles.muted}>Del combo solo se puede cambiar después el precio y si está activo.</p>

      {datos.combos.length === 0 ? (
        <Vacio icono={Package} titulo="Todavía no hay combos" detalle="Crea uno y luego agrégale sus productos." />
      ) : (
        <div className={ui.tw}>
          <table className={ui.tabla}>
            <thead>
              <tr>
                <th>Combo</th>
                <th className={ui.num}>Precio</th>
                <th>Estado</th>
                <th>
                  <span className={ui.soloLector}>Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {datos.combos.map((combo) => {
                const enEdicion = editando?.id === combo.id
                return (
                  <Fragment key={combo.id}>
                    <tr className={combo.activo ? undefined : ui.inactiva}>
                      <td>
                        <b>{combo.nombre}</b>
                      </td>
                      <td className={ui.num}>
                        {enEdicion ? (
                          <input
                            className={ui.edicion}
                            style={{ width: 120 }}
                            aria-label="Precio del combo"
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
                        <EstadoPildora activo={combo.activo} />
                      </td>
                      <td className={ui.acciones}>
                        <Acciones>
                          {enEdicion ? (
                            <>
                              <BotonIcono icono={Check} titulo="Guardar precio" tono="ok" disabled={ocupado} onClick={() => cambiarPrecio(combo, editando.texto)} />
                              <BotonIcono icono={X} titulo="Cancelar" onClick={() => setEditando(null)} />
                            </>
                          ) : (
                            <>
                              <BotonIcono
                                icono={PackageOpen}
                                titulo={abiertoId === combo.id ? 'Ocultar productos' : 'Productos del combo'}
                                tono={abiertoId === combo.id ? 'activo' : undefined}
                                expandido={abiertoId === combo.id}
                                onClick={() => setAbiertoId(abiertoId === combo.id ? null : combo.id)}
                              />
                              <BotonIcono
                                icono={Pencil}
                                titulo={`Cambiar el precio de «${combo.nombre}»`}
                                onClick={() => setEditando({ id: combo.id, texto: String(combo.precio) })}
                              />
                              <BotonIcono
                                icono={Power}
                                titulo={combo.activo ? `Desactivar «${combo.nombre}»` : `Activar «${combo.nombre}»`}
                                tono={combo.activo ? 'ok' : 'off'}
                                disabled={ocupado}
                                onClick={() =>
                                  void ejecutar(
                                    () => combosApi.toggleActivo(combo.id),
                                    combo.activo ? 'Combo desactivado' : 'Combo activado',
                                  )
                                }
                              />
                              <BotonIcono icono={Trash2} titulo={`Eliminar «${combo.nombre}»`} tono="peligro" disabled={ocupado} onClick={() => void eliminar(combo)} />
                            </>
                          )}
                        </Acciones>
                      </td>
                    </tr>
                    {abiertoId === combo.id && (
                      <tr className={ui.detalle}>
                        <td colSpan={4}>
                          <ComboProductos combo={combo} productos={datos.productos} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
