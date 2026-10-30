import { useCallback, useEffect, useState, type SubmitEvent } from 'react'
import { repartidoresApi } from '../../apis/repartidores.ts'
import type { Repartidor, TipoRepartidor } from '../../apis/repartidores.ts'
import { useToast } from '../../toast/toast-context.ts'
import { esAbort, mensajeDeError } from '../../utils/formato.ts'
import styles from '../catalogo/Catalogo.module.css'

interface FormProps {
  repartidor?: Repartidor
  onListo: () => void
  onCancelar: () => void
}

function Formulario({ repartidor, onListo, onCancelar }: FormProps) {
  const toast = useToast()
  const [nombre, setNombre] = useState(repartidor?.nombre ?? '')
  const [tipo, setTipo] = useState<TipoRepartidor>(repartidor?.tipo ?? 'persona')
  const [telefono, setTelefono] = useState(repartidor?.telefono ?? '')
  const [enviando, setEnviando] = useState(false)

  async function guardar(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (nombre.trim() === '') return toast.error('Escribe el nombre del repartidor o de la empresa')
    setEnviando(true)
    try {
      const datos = { nombre: nombre.trim(), tipo, telefono: telefono.trim() || null }
      if (repartidor) await repartidoresApi.actualizar(repartidor.id, datos)
      else await repartidoresApi.crear(datos)
      toast.exito(repartidor ? 'Repartidor actualizado' : `${datos.nombre} agregado`)
      onListo()
    } catch (e) {
      toast.error(e)
      setEnviando(false)
    }
  }

  return (
    <section className={styles.card}>
      <h2>{repartidor ? `Editar ${repartidor.nombre}` : 'Nuevo repartidor'}</h2>
      <form className={styles.form} onSubmit={guardar}>
          <label className={`${styles.field} ${styles.grow}`}>
            <span>Nombre o empresa</span>
            <input value={nombre} maxLength={80} onChange={(e) => setNombre(e.target.value)} required />
          </label>
          <label className={styles.field}>
            <span>Tipo</span>
            <select value={tipo} onChange={(e) => setTipo(e.target.value as TipoRepartidor)}>
              <option value="persona">Persona</option>
              <option value="empresa">Empresa</option>
            </select>
          </label>
          <label className={styles.field}>
            <span>Teléfono (opcional)</span>
            <input type="tel" inputMode="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} />
          </label>
          <button className={styles.primary} type="submit" disabled={enviando}>
            {enviando ? 'Guardando…' : 'Guardar'}
          </button>
          <button className={styles.secondary} type="button" onClick={onCancelar}>
            Cancelar
          </button>
      </form>
    </section>
  )
}

export function RepartidoresAdmin() {
  const toast = useToast()
  const [lista, setLista] = useState<Repartidor[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [panel, setPanel] = useState<'nuevo' | Repartidor | null>(null)
  const [ocupadoId, setOcupadoId] = useState<number | null>(null)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    repartidoresApi
      .listar(true, { signal: controller.signal })
      .then((datos) => {
        setLista(datos)
        setError(null)
      })
      .catch((e: unknown) => {
        if (!esAbort(e)) setError(mensajeDeError(e))
      })
    return () => controller.abort()
  }, [version])

  const recargar = useCallback(() => setVersion((v) => v + 1), [])

  async function cambiarActivo(r: Repartidor) {
    setOcupadoId(r.id)
    try {
      await repartidoresApi.actualizar(r.id, { activo: !r.activo })
      toast.exito(r.activo ? `${r.nombre} ya no aparece en caja` : `${r.nombre} vuelve a aparecer en caja`)
    } catch (e) {
      toast.error(e)
    } finally {
      setOcupadoId(null)
      recargar()
    }
  }

  async function eliminar(r: Repartidor) {
    if (!window.confirm(`¿Borrar a ${r.nombre}?`)) return
    setOcupadoId(r.id)
    try {
      await repartidoresApi.eliminar(r.id)
      toast.exito(`${r.nombre} fue borrado`)
    } catch (e) {
      // Si ya hizo entregas el servidor no lo borra: se explica y se ofrece desactivarlo.
      toast.error(e)
    } finally {
      setOcupadoId(null)
      recargar()
    }
  }

  return (
    <div className={styles.page}>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      {panel === 'nuevo' && (
        <Formulario onListo={() => { setPanel(null); recargar() }} onCancelar={() => setPanel(null)} />
      )}
      {panel && panel !== 'nuevo' && (
        <Formulario
          key={panel.id}
          repartidor={panel}
          onListo={() => { setPanel(null); recargar() }}
          onCancelar={() => setPanel(null)}
        />
      )}

      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <h2>Repartidores y empresas</h2>
          <button className={styles.primary} type="button" onClick={() => setPanel('nuevo')}>
            Nuevo repartidor
          </button>
        </div>

        {!lista && !error && <p className={styles.muted}>Cargando…</p>}
        {lista && lista.length === 0 && (
          <p className={styles.muted}>Todavía no hay repartidores. Agrega uno para elegirlo en los domicilios.</p>
        )}
        {lista && lista.length > 0 && (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Tipo</th>
                  <th>Teléfono</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {lista.map((r) => (
                  <tr key={r.id} className={r.activo ? undefined : styles.inactiva}>
                    <td>{r.nombre}</td>
                    <td>{r.tipo === 'empresa' ? 'Empresa' : 'Persona'}</td>
                    <td>{r.telefono ?? '—'}</td>
                    <td>
                      <span className={`${styles.badge} ${r.activo ? styles.badgeOn : styles.badgeOff}`}>
                        {r.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td>
                      <div className={styles.acciones}>
                        <button className={styles.link} type="button" onClick={() => setPanel(r)}>
                          Editar
                        </button>
                        <button className={styles.link} type="button" disabled={ocupadoId === r.id} onClick={() => cambiarActivo(r)}>
                          {r.activo ? 'Desactivar' : 'Activar'}
                        </button>
                        <button className={styles.link} type="button" disabled={ocupadoId === r.id} onClick={() => eliminar(r)}>
                          Borrar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
