import { Plus, Pencil, Power, Tag, Trash2, Wheat } from 'lucide-react'
import { useState, type SubmitEvent } from 'react'
import { ingredientesApi } from '../../apis/ingredientes.ts'
import type { Ingrediente } from '../../apis/ingredientes.ts'
import { useToast } from '../../toast/toast-context.ts'
import { formatearMonto, parseMonto } from '../../utils/formato.ts'
import type { DatosCatalogo } from './useCatalogoAdmin.ts'
import { mensajeEliminar } from './errores.ts'
import { MatrizPreciosIngredientes } from './MatrizPreciosIngredientes.tsx'
import { useAccion } from './useAccion.ts'
import { Acciones, Buscador, BotonIcono, Cabeza, EstadoPildora, FiltroEstadoBarra, Vacio } from '../admin/ui.tsx'
import { coincideEstado } from '../admin/filtros.ts'
import type { FiltroEstado } from '../admin/filtros.ts'
import ui from '../admin/Ui.module.css'
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
        <button className={`${ui.btn} ${ui.primario}`} type="submit" disabled={ocupado}>
          {ocupado ? 'Guardando…' : 'Guardar'}
        </button>
        <button className={`${ui.btn} ${ui.secundario}`} type="button" onClick={onCancelar}>
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
  const [busqueda, setBusqueda] = useState('')
  const [filtro, setFiltro] = useState<FiltroEstado>('todos')
  const enEdicion = typeof formulario === 'number' ? datos.ingredientes.find((i) => i.id === formulario) : undefined

  // Se reinicia la matriz cuando cambian los precios guardados.
  const claveMatriz = datos.preciosIngrediente
    .map((p) => `${p.ingrediente_id}:${p.tamano_id}:${p.precio_extra}`)
    .join('|')

  const texto = busqueda.trim().toLowerCase()
  const visibles = datos.ingredientes.filter((i) => coincideEstado(filtro, i.activo) && i.nombre.toLowerCase().includes(texto))

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
        <Cabeza icono={Wheat} titulo="Ingredientes" cuenta={datos.ingredientes.length}>
          <button className={`${ui.btn} ${ui.primario}`} type="button" onClick={() => setFormulario('nuevo')}>
            <Plus size={16} aria-hidden="true" /> Nuevo ingrediente
          </button>
        </Cabeza>

        {datos.ingredientes.length === 0 ? (
          <Vacio icono={Wheat} titulo="Todavía no hay ingredientes" detalle="Crea el primero para usarlo como extra." />
        ) : (
          <>
            <div className={ui.herramientas}>
              <Buscador valor={busqueda} onChange={setBusqueda} etiqueta="Buscar ingrediente" />
              <FiltroEstadoBarra valor={filtro} onChange={setFiltro} items={datos.ingredientes} />
            </div>
            {visibles.length === 0 ? (
              <Vacio icono={Wheat} titulo="No hay ingredientes que coincidan" detalle="Prueba con otro nombre o quita el filtro." />
            ) : (
              <div className={ui.tw}>
                <table className={ui.tabla}>
                  <thead>
                    <tr>
                      <th>Nombre</th>
                      <th className={ui.num}>Precio base</th>
                      <th>Estado</th>
                      <th>
                        <span className={ui.soloLector}>Acciones</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibles.map((ingrediente) => (
                      <tr key={ingrediente.id} className={ingrediente.activo ? undefined : ui.inactiva}>
                        <td>
                          <b>{ingrediente.nombre}</b>
                        </td>
                        <td className={ui.num}>{formatearMonto(ingrediente.precio_extra)}</td>
                        <td>
                          <EstadoPildora activo={ingrediente.activo} />
                        </td>
                        <td className={ui.acciones}>
                          <Acciones>
                            <BotonIcono icono={Pencil} titulo={`Editar «${ingrediente.nombre}»`} onClick={() => setFormulario(ingrediente.id)} />
                            <BotonIcono
                              icono={Power}
                              titulo={ingrediente.activo ? `Desactivar «${ingrediente.nombre}»` : `Activar «${ingrediente.nombre}»`}
                              tono={ingrediente.activo ? 'ok' : 'off'}
                              disabled={ocupado}
                              onClick={() =>
                                void ejecutar(
                                  () => ingredientesApi.actualizar(ingrediente.id, { activo: !ingrediente.activo }),
                                  ingrediente.activo ? 'Ingrediente desactivado' : 'Ingrediente activado',
                                )
                              }
                            />
                            <BotonIcono icono={Trash2} titulo={`Eliminar «${ingrediente.nombre}»`} tono="peligro" disabled={ocupado} onClick={() => void eliminar(ingrediente)} />
                          </Acciones>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </section>

      <section className={styles.card}>
        <Cabeza icono={Tag} titulo="Precio de los extras por tamaño" />
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