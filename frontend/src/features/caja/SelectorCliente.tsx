import { Search, UserPlus } from 'lucide-react'
import { useState, type SubmitEvent } from 'react'
import { clientesApi } from '../../apis/clientes.ts'
import type { Cliente } from '../../apis/clientes.ts'
import { useToast } from '../../toast/toast-context.ts'
import styles from './Ticket.module.css'

interface Props {
  clientes: Cliente[]
  /** En domicilio hace falta un teléfono para avisar al cliente. */
  requiereTelefono: boolean
  /** Ya hay un cliente real elegido: se ofrece volver a Mostrador. */
  puedeVolverAMostrador: boolean
  onElegir: (cliente: Cliente) => void
  onMostrador: () => void
  onCreado: (cliente: Cliente) => void
}

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

const NUEVO_VACIO = { nombre: '', telefono: '', direccion: '', nit: '' }

/** Buscar un cliente por nombre, NIT o teléfono, o crear uno nuevo sin salir del pedido. */
export function SelectorCliente({
  clientes,
  requiereTelefono,
  puedeVolverAMostrador,
  onElegir,
  onMostrador,
  onCreado,
}: Props) {
  const toast = useToast()
  const [busqueda, setBusqueda] = useState('')
  const [creando, setCreando] = useState(false)
  const [nuevo, setNuevo] = useState(NUEVO_VACIO)
  const [enviando, setEnviando] = useState(false)

  const texto = normalizar(busqueda.trim())
  const coincidencias = clientes
    .filter((c) => normalizar(`${c.nombre} ${c.nit} ${c.telefono}`).includes(texto))
    .slice(0, 8)

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

  if (creando) {
    return (
      <form className={styles.formulario} onSubmit={crear}>
        <label className={styles.campo}>
          <span>Nombre</span>
          <input autoFocus value={nuevo.nombre} onChange={(e) => campo('nombre', e.target.value)} required />
        </label>
        <label className={styles.campo}>
          <span>Teléfono{requiereTelefono ? '' : ' (opcional)'}</span>
          <input
            type="tel"
            inputMode="tel"
            value={nuevo.telefono}
            onChange={(e) => campo('telefono', e.target.value)}
            required={requiereTelefono}
          />
        </label>
        <label className={styles.campo}>
          <span>Dirección (opcional)</span>
          <input value={nuevo.direccion} onChange={(e) => campo('direccion', e.target.value)} />
        </label>
        <label className={styles.campo}>
          <span>NIT / CI (opcional)</span>
          <input value={nuevo.nit} onChange={(e) => campo('nit', e.target.value)} />
        </label>
        <button className={styles.principal} type="submit" disabled={enviando}>
          {enviando ? 'Guardando…' : 'Guardar y elegir'}
        </button>
        <button className={styles.secundario} type="button" onClick={() => setCreando(false)}>
          Volver
        </button>
      </form>
    )
  }

  return (
    <div className={styles.formulario}>
      <label className={styles.buscador}>
        <Search size={18} aria-hidden="true" />
        <input
          type="search"
          autoFocus
          placeholder="Buscar por nombre, NIT o teléfono"
          aria-label="Buscar cliente"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
      </label>

      <ul className={styles.listaClientes}>
        {coincidencias.map((c) => (
          <li key={c.id}>
            <button type="button" onClick={() => onElegir(c)}>
              <b>{c.nombre}</b>
              <small>
                {c.telefono && c.telefono !== '0' ? `Tel. ${c.telefono}` : 'Sin teléfono'}
                {c.nit && c.nit !== '0' ? ` · NIT ${c.nit}` : ''}
              </small>
            </button>
          </li>
        ))}
        {coincidencias.length === 0 && <li className={styles.sinResultados}>No hay clientes que coincidan.</li>}
      </ul>

      <button className={styles.secundario} type="button" onClick={() => setCreando(true)}>
        <UserPlus size={16} aria-hidden="true" /> Cliente nuevo
      </button>
      {puedeVolverAMostrador && (
        <button className={styles.enlace} type="button" onClick={onMostrador}>
          Volver a Mostrador
        </button>
      )}
    </div>
  )
}
