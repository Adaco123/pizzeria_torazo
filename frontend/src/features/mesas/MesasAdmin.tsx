import { CircleDot, Plus, Power, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useState, type SubmitEvent } from 'react'
import { mesasApi } from '../../apis/mesas.ts'
import type { Mesa } from '../../apis/mesas.ts'
import { useToast } from '../../toast/toast-context.ts'
import { esAbort, mensajeDeError } from '../../utils/formato.ts'
import { Acciones, BotonIcono, Cabeza, Vacio } from '../admin/ui.tsx'
import ui from '../admin/Ui.module.css'
import styles from '../catalogo/Catalogo.module.css'

export function MesasAdmin() {
  const toast = useToast()
  const [lista, setLista] = useState<Mesa[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [numero, setNumero] = useState('')
  const [ocupadoId, setOcupadoId] = useState<number | null>(null)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    mesasApi
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

  async function crear(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    const n = Number(numero)
    if (!Number.isInteger(n) || n < 1) return toast.error('Escribe el número de la mesa')
    try {
      await mesasApi.crear(n)
      toast.exito(`Mesa ${n} creada`)
      setNumero('')
    } catch (e) {
      toast.error(e)
    }
    recargar()
  }

  async function cambiarActiva(m: Mesa) {
    setOcupadoId(m.id)
    try {
      await mesasApi.actualizar(m.id, { activa: !m.activa })
      toast.exito(m.activa ? `Mesa ${m.numero} desactivada` : `Mesa ${m.numero} activada`)
    } catch (e) {
      toast.error(e)
    } finally {
      setOcupadoId(null)
      recargar()
    }
  }

  async function eliminar(m: Mesa) {
    if (!window.confirm(`¿Borrar la mesa ${m.numero}?`)) return
    setOcupadoId(m.id)
    try {
      await mesasApi.eliminar(m.id)
      toast.exito(`Mesa ${m.numero} borrada`)
    } catch (e) {
      toast.error(e)
    } finally {
      setOcupadoId(null)
      recargar()
    }
  }

  return (
    <div className={styles.page}>
      <section className={styles.card}>
        <Cabeza icono={CircleDot} titulo="Mesas" cuenta={lista?.length} />

        <form className={styles.form} onSubmit={crear}>
          <label className={styles.field}>
            <span>Número de mesa</span>
            <input type="number" min="1" max="999" value={numero} onChange={(e) => setNumero(e.target.value)} required />
          </label>
          <button className={`${ui.btn} ${ui.primario}`} type="submit">
            <Plus size={16} aria-hidden="true" /> Agregar
          </button>
        </form>

        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
        {lista === null && !error && <p className={styles.muted}>Cargando…</p>}
        {lista?.length === 0 && <Vacio icono={CircleDot} titulo="Todavía no hay mesas" detalle="Agrega la primera con su número." />}
        {lista && lista.length > 0 && (
          <ul className={ui.baldosas}>
            {lista.map((m) => (
              <li key={m.id} className={`${ui.baldosa} ${!m.activa ? ui.baldosaOff : m.cuenta ? ui.baldosaOcupada : ''}`}>
                <strong>Mesa {m.numero}</strong>
                <span className={`${ui.estado} ${m.activa ? ui.estadoOn : ui.estadoOff}`}>
                  {!m.activa ? 'Desactivada' : m.cuenta ? 'Ocupada' : 'Libre'}
                </span>
                <Acciones>
                  <BotonIcono
                    icono={Power}
                    titulo={m.activa ? `Desactivar la mesa ${m.numero}` : `Activar la mesa ${m.numero}`}
                    tono={m.activa ? 'ok' : 'off'}
                    disabled={ocupadoId === m.id}
                    onClick={() => void cambiarActiva(m)}
                  />
                  <BotonIcono icono={Trash2} titulo={`Borrar la mesa ${m.numero}`} tono="peligro" disabled={ocupadoId === m.id} onClick={() => void eliminar(m)} />
                </Acciones>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
