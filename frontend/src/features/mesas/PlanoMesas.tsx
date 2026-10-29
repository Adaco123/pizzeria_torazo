import { useState } from 'react'
import { useNavigate } from 'react-router'
import { mesasApi } from '../../api.ts'
import type { Mesa } from '../../api.ts'
import { useToast } from '../../toast/toast-context.ts'
import { formatearMonto } from '../../utils/formato.ts'
import base from '../pedidos/Pedidos.module.css'
import styles from './Mesas.module.css'
import { useMesas } from './useMesas.ts'

function clase(mesa: Mesa): string {
  const c = mesa.cuenta
  if (!c) return `${styles.mesa} ${styles.mesaLibre}`
  if (c.pidio_cuenta) return `${styles.mesa} ${styles.mesaCuenta}`
  if (c.rondas_listas > 0) return `${styles.mesa} ${styles.mesaOcupada} ${styles.mesaListo}`
  return `${styles.mesa} ${styles.mesaOcupada}`
}

function Nota({ mesa }: { mesa: Mesa }) {
  const c = mesa.cuenta
  if (!c) return <span className={styles.nota}>Libre</span>
  return (
    <>
      <span className={styles.total}>{formatearMonto(c.total)}</span>
      {c.pidio_cuenta && <span className={styles.nota}>Pidió la cuenta</span>}
      {c.rondas_listas > 0 && <span className={styles.nota}>{c.rondas_listas} lista(s) para llevar</span>}
      {c.rondas_en_cocina > 0 && <span className={styles.nota}>{c.rondas_en_cocina} en cocina</span>}
      {c.rondas === 0 && <span className={styles.nota}>Sin pedidos aún</span>}
    </>
  )
}

export function PlanoMesas() {
  const { mesas, error, recargar } = useMesas()
  const navegar = useNavigate()
  const toast = useToast()
  const [abriendo, setAbriendo] = useState<number | null>(null)

  async function tocar(mesa: Mesa) {
    if (mesa.cuenta) {
      navegar(`/mesas/${mesa.cuenta.id}`)
      return
    }
    if (!window.confirm(`¿Abrir la mesa ${mesa.numero}?`)) return
    setAbriendo(mesa.id)
    try {
      const cuenta = await mesasApi.abrir(mesa.id)
      navegar(`/mesas/${cuenta.id}`)
    } catch (e) {
      toast.error(e)
      recargar()
    } finally {
      setAbriendo(null)
    }
  }

  if (error && !mesas) {
    return (
      <p className={base.error} role="alert">
        {error}
      </p>
    )
  }
  if (!mesas) return <p className={base.muted}>Cargando mesas…</p>
  if (mesas.length === 0) {
    return <p className={base.muted}>Todavía no hay mesas. El administrador las crea en Administración → Mesas.</p>
  }

  return (
    <div className={styles.plano} aria-label="Plano de mesas">
      {mesas.map((mesa) => (
        <button
          key={mesa.id}
          type="button"
          className={clase(mesa)}
          disabled={abriendo === mesa.id}
          onClick={() => void tocar(mesa)}
          aria-label={`Mesa ${mesa.numero}${mesa.cuenta ? ', ocupada' : ', libre'}`}
        >
          <span className={styles.numero}>Mesa {mesa.numero}</span>
          <Nota mesa={mesa} />
        </button>
      ))}
    </div>
  )
}
