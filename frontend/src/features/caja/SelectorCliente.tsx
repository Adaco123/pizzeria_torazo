import { useState, type SubmitEvent } from 'react'
import { clientesApi } from '../../apis/clientes.ts'
import type { Cliente } from '../../apis/clientes.ts'
import { useToast } from '../../toast/toast-context.ts'
import styles from '../pedidos/Pedidos.module.css'

interface Props {
  clientes: Cliente[]
  /** En domicilio hace falta un teléfono para avisar al cliente. */
  requiereTelefono: boolean
  onElegir: (cliente: Cliente) => void
  onCreado: (cliente: Cliente) => void
  onCerrar: () => void
}

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

const NUEVO_VACIO = { nombre: '', telefono: '', direccion: '', nit: '' }

export function SelectorCliente({ clientes, requiereTelefono, onElegir, onCreado, onCerrar }: Props) {
  const toast = useToast()
  const [busqueda, setBusqueda] = useState('')
  const [creando, setCreando] = useState(false)
  const [nuevo, setNuevo] = useState(NUEVO_VACIO)
  const [enviando, setEnviando] = useState(false)

  const texto = normalizar(busqueda.trim())
  const coincidencias = clientes
    .filter((c) => normalizar(`${c.nombre} ${c.nit} ${c.telefono}`).includes(texto))
    .slice(0, 6)

  function campo(nombre: keyof typeof NUEVO_VACIO, valor: string) {
    setNuevo((actual) => ({ ...actual, [nombre]: valor }))
  }

  async function crear(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (nuevo.nombre.trim() === '') return toast.error('Escribe el nombre del cliente')
    if (requiereTelefono && nuevo.telefono.trim() === '') {
      return toast.error('Para un domicilio hace falta el teléfono del cliente')
    }

    setEnviando(true)
    try {
      const creado = await clientesApi.crear({
        nombre: nuevo.nombre.trim(),
        telefono: nuevo.telefono.trim(),
        direccion: nuevo.direccion.trim(),
        nit: nuevo.nit.trim(),
      })
      toast.exito(`Cliente ${creado.nombre} creado`)
      onCreado(creado)
      onElegir(creado)
    } catch (e) {
      toast.error(e)
      setEnviando(false)
    }
  }

  return (
    <div className={styles.subCard}>
      <input
        type="search"
        autoFocus
        placeholder="Buscar por nombre, NIT o teléfono"
        aria-label="Buscar cliente"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
      />

      <ul className={styles.clientList}>
        {coincidencias.map((c) => (
          <li key={c.id}>
            <button type="button" className={styles.clientOption} onClick={() => onElegir(c)}>
              <strong>{c.nombre}</strong>
              <span className={styles.muted}>
                {c.telefono && c.telefono !== '0' ? `Tel. ${c.telefono}` : 'Sin teléfono'}
                {c.nit && c.nit !== '0' ? ` · NIT ${c.nit}` : ''}
              </span>
            </button>
          </li>
        ))}
        {coincidencias.length === 0 && <li className={styles.muted}>No hay clientes que coincidan.</li>}
      </ul>

      {creando ? (
        <form className={styles.formStack} onSubmit={crear}>
          <div className={styles.formRow}>
            <label className={`${styles.field} ${styles.grow}`}>
              <span>Nombre</span>
              <input value={nuevo.nombre} onChange={(e) => campo('nombre', e.target.value)} required />
            </label>
            <label className={styles.field}>
              <span>Teléfono{requiereTelefono ? '' : ' (opcional)'}</span>
              <input
                type="tel"
                inputMode="tel"
                value={nuevo.telefono}
                onChange={(e) => campo('telefono', e.target.value)}
                required={requiereTelefono}
              />
            </label>
          </div>
          <div className={styles.formRow}>
            <label className={`${styles.field} ${styles.grow}`}>
              <span>Dirección (opcional)</span>
              <input value={nuevo.direccion} onChange={(e) => campo('direccion', e.target.value)} />
            </label>
            <label className={styles.field}>
              <span>NIT / CI (opcional)</span>
              <input value={nuevo.nit} onChange={(e) => campo('nit', e.target.value)} />
            </label>
          </div>
          <div className={styles.formRow}>
            <button className={styles.primary} type="submit" disabled={enviando}>
              {enviando ? 'Guardando…' : 'Guardar y elegir'}
            </button>
            <button className={styles.secondary} type="button" onClick={() => setCreando(false)}>
              Volver
            </button>
          </div>
        </form>
      ) : (
        <div className={styles.formRow}>
          <button className={styles.secondary} type="button" onClick={() => setCreando(true)}>
            + Cliente nuevo
          </button>
          <button className={styles.link} type="button" onClick={onCerrar}>
            Cerrar
          </button>
        </div>
      )}
    </div>
  )
}
