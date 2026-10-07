import { useState, type SubmitEvent } from 'react'
import { ingredientesApi } from '../../api.ts'
import type { Ingrediente } from '../../api.ts'
import { useToast } from '../../toast/toast-context.ts'
import { formatearMonto, parseMonto } from '../../utils/formato.ts'
import type { DatosCatalogo } from './useCatalogoAdmin.ts'
import { mensajeEliminar } from './errores.ts'
import { MatrizPreciosIngredientes } from './MatrizPreciosIngredientes.tsx'
import { useAccion } from './useAccion.ts'
import styles from './Catalogo.module.css'

interface FormProps {
  inicial?: Ingrediente
  onGuardado: () => void
  onCancelar: () => void
}

function IngredienteForm({ inicial, onGuardado, onCancelar }: FormProps) {
  const toast = useToast()
  const { ocupado, ejecutar } = useAccion(onGuardado)
  const [nombre, setNombre] = useState(inicial?.nombre ?? '')
  const [precio, setPrecio] = useState(inicial ? String(inicial.precio_extra) : '0')
  const [activo, setActivo] = useState(inicial?.activo ?? true)

  async function guardar(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    const limpio = nombre.trim()
    const precioExtra = parseMonto(precio)
    if (!limpio) return toast.error('Escribe el nombre del ingrediente')
    if (precioExtra === null) return toast.error('El precio base debe ser un monto válido (0 o mayor)')

    const datos = { nombre: limpio, precio_extra: precioExtra, activo }
    await ejecutar(
      () => (inicial ? ingredientesApi.actualizar(inicial.id, datos) : ingredientesApi.crear(datos)),
      inicial ? 'Ingrediente actualizado' : `Ingrediente «${limpio}» creado`,
    )
  }

  return (
    <section className={styles.card}>
      <h2>{inicial ? `Editar «${inicial.nombre}»` : 'Nuevo ingrediente'}</h2>
      <form className={styles.form} onSubmit={guardar}>
        <label className={`${styles.field} ${styles.grow}`}>
          <span>Nombre</span>
          <input value={nombre} maxLength={100} onChange={(e) => setNombre(e.target.value)} />
        </label>
        <label className={styles.field}>
          <span>Precio base del extra (Bs)</span>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={precio}
            onChange={(e) => setPrecio(e.target.value)}
          />
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
    </section>
  )
}

interface Props {
  datos: DatosCatalogo
  recargar: () => void
}

export function IngredientesTab({ datos, recargar }: Props) {
  const { ocupado, ejecutar } = useAccion(recargar)
  const [formulario, setFormulario] = useState<'nuevo' | number | null>(null)
  const enEdicion = typeof formulario === 'number' ? datos.ingredientes.find((i) => i.id === formulario) : undefined

  // Se reinicia la matriz cuando cambian los precios guardados.
  const claveMatriz = datos.preciosIngrediente
    .map((p) => `${p.ingrediente_id}:${p.tamano_id}:${p.precio_extra}`)
    .join('|')

  async function eliminar(ingrediente: Ingrediente) {
    if (!window.confirm(`¿Eliminar el ingrediente «${ingrediente.nombre}»?`)) return
    await ejecutar(
      () => ingredientesApi.eliminar(ingrediente.id),
      'Ingrediente eliminado',
      (e) => mensajeEliminar(e, ingrediente.nombre),
    )
  }

  const cerrarFormulario = () => {
    setFormulario(null)
    recargar()
  }

  return (
    <>
      {formulario === 'nuevo' && <IngredienteForm onGuardado={cerrarFormulario} onCancelar={() => setFormulario(null)} />}
      {enEdicion && (
        <IngredienteForm
          key={enEdicion.id}
          inicial={enEdicion}
          onGuardado={cerrarFormulario}
          onCancelar={() => setFormulario(null)}
        />
      )}

      <section className={styles.card}>
        <div className={styles.headerRow}>
          <h2>Ingredientes</h2>
          <button className={styles.primary} type="button" onClick={() => setFormulario('nuevo')}>
            + Nuevo ingrediente
          </button>
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Nombre</th>
                <th className={styles.num}>Precio base</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {datos.ingredientes.map((ingrediente) => (
                <tr key={ingrediente.id} className={ingrediente.activo ? undefined : styles.inactiva}>
                  <td>{ingrediente.nombre}</td>
                  <td className={styles.num}>{formatearMonto(ingrediente.precio_extra)}</td>
                  <td>
                    <span className={ingrediente.activo ? `${styles.badge} ${styles.badgeOn}` : `${styles.badge} ${styles.badgeOff}`}>
                      {ingrediente.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className={styles.acciones}>
                    <button className={styles.link} type="button" onClick={() => setFormulario(ingrediente.id)}>
                      editar
                    </button>
                    <button
                      className={styles.link}
                      type="button"
                      disabled={ocupado}
                      onClick={() =>
                        ejecutar(
                          () => ingredientesApi.actualizar(ingrediente.id, { activo: !ingrediente.activo }),
                          ingrediente.activo ? 'Ingrediente desactivado' : 'Ingrediente activado',
                        )
                      }
                    >
                      {ingrediente.activo ? 'desactivar' : 'activar'}
                    </button>
                    <button className={styles.linkDanger} type="button" disabled={ocupado} onClick={() => eliminar(ingrediente)}>
                      eliminar
                    </button>
                  </td>
                </tr>
              ))}
              {datos.ingredientes.length === 0 && (
                <tr>
                  <td colSpan={4} className={styles.muted}>
                    Todavía no hay ingredientes.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className={styles.card}>
        <h2>Precio de los extras por tamaño</h2>
        <p className={styles.hint}>
          Si un tamaño queda vacío, en una pizza normal se cobra el precio base del ingrediente, pero en
          una pizza mitad y mitad el extra se cobra en 0. Conviene llenar todos los tamaños.
        </p>
        <MatrizPreciosIngredientes
          key={claveMatriz}
          ingredientes={datos.ingredientes}
          tamanos={datos.tamanos}
          precios={datos.preciosIngrediente}
          recargar={recargar}
        />
      </section>
    </>
  )
}