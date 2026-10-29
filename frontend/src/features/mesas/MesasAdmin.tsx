import { useCallback, useEffect, useState, type SubmitEvent } from 'react'
import { mesasApi } from '../../api.ts'
import type { Mesa } from '../../api.ts'
import { useToast } from '../../toast/toast-context.ts'
import { esAbort, mensajeDeError } from '../../utils/formato.ts'
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
        <h2>Nueva mesa</h2>
        <form className={styles.form} onSubmit={crear}>
          <label className={styles.field}>
            <span>Número de mesa</span>
            <input type="number" min="1" max="999" value={numero} onChange={(e) => setNumero(e.target.value)} required />
          </label>
          <button className={styles.primary} type="submit">
            Agregar
          </button>
        </form>
      </section>

      <section className={styles.card}>
        <h2>Mesas</h2>
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
        {lista === null && !error && <p className={styles.muted}>Cargando…</p>}
        {lista?.length === 0 && <p className={styles.muted}>Todavía no hay mesas.</p>}
        {lista && lista.length > 0 && (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {lista.map((m) => (
              <li key={m.id} style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                <strong>Mesa {m.numero}</strong>
                <span className={styles.muted}>
                  {!m.activa ? 'Desactivada' : m.cuenta ? 'Ocupada' : 'Libre'}
                </span>
                <button className={styles.secondary} type="button" disabled={ocupadoId === m.id} onClick={() => void cambiarActiva(m)}>
                  {m.activa ? 'Desactivar' : 'Activar'}
                </button>
                <button className={styles.secondary} type="button" disabled={ocupadoId === m.id} onClick={() => void eliminar(m)}>
                  Borrar
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
