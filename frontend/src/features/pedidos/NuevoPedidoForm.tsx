import { useState, type SubmitEvent } from 'react'
import { clientesApi, pedidosApi } from '../../api.ts'
import type { Cliente } from '../../api.ts'
import { useToast } from '../../toast/toast-context.ts'
import { TIPO_ENTREGA_ID, type TipoEntregaNombre } from './estados.ts'
import styles from './Pedidos.module.css'

interface Props {
  usuarioId: number
  turnoId: number
  clientes: Cliente[]
  /** Para recargar la lista de clientes después de crear uno. */
  onClienteCreado: () => void
  onCreado: (pedidoId: number) => void
  onCancelar: () => void
}

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

const CLIENTE_VACIO = { nombre: '', telefono: '', direccion: '', nit: '', correo: '' }

export function NuevoPedidoForm({
  usuarioId,
  turnoId,
  clientes,
  onClienteCreado,
  onCreado,
  onCancelar,
}: Props) {
  const toast = useToast()
  const [busqueda, setBusqueda] = useState('')
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [tipo, setTipo] = useState<TipoEntregaNombre>('Local')
  const [direccion, setDireccion] = useState('')
  const [creandoCliente, setCreandoCliente] = useState(false)
  const [nuevo, setNuevo] = useState(CLIENTE_VACIO)
  const [enviando, setEnviando] = useState(false)

  const texto = normalizar(busqueda.trim())
  const coincidencias = clientes
    .filter((c) => normalizar(`${c.nombre} ${c.nit} ${c.telefono}`).includes(texto))
    .slice(0, 6)

  function elegirCliente(elegido: Cliente) {
    setCliente(elegido)
    if (tipo === 'Domicilio' && direccion.trim() === '') setDireccion(elegido.direccion)
  }

  function elegirTipo(siguiente: TipoEntregaNombre) {
    setTipo(siguiente)
    if (siguiente === 'Domicilio' && direccion.trim() === '' && cliente) {
      setDireccion(cliente.direccion)
    }
  }

  function campoNuevo(campo: keyof typeof CLIENTE_VACIO, valor: string) {
    setNuevo((actual) => ({ ...actual, [campo]: valor }))
  }

  async function crearCliente(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    setEnviando(true)
    try {
      const creado = await clientesApi.crear({
        nombre: nuevo.nombre.trim(),
        telefono: nuevo.telefono.trim(),
        direccion: nuevo.direccion.trim(),
        nit: nuevo.nit.trim(),
        correo: nuevo.correo.trim() || null,
      })
      toast.exito(`Cliente ${creado.nombre} creado`)
      onClienteCreado()
      elegirCliente(creado)
      setNuevo(CLIENTE_VACIO)
      setCreandoCliente(false)
    } catch (e) {
      toast.error(e)
    } finally {
      setEnviando(false)
    }
  }

  async function crearPedido(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!cliente) return toast.error('Elige un cliente')
    if (tipo === 'Domicilio' && direccion.trim() === '') {
      return toast.error('Escribe la dirección de entrega')
    }

    setEnviando(true)
    try {
      const pedido = await pedidosApi.crear({
        cliente_id: cliente.id,
        usuario_id: usuarioId,
        turno_id: turnoId,
        tipo_entrega_id: TIPO_ENTREGA_ID[tipo],
        direccion_entrega: tipo === 'Domicilio' ? direccion.trim() : null,
      })
      toast.exito(`Pedido N° ${pedido.numero_turno} creado`)
      onCreado(pedido.id)
    } catch (e) {
      toast.error(e)
      setEnviando(false)
    }
  }

  return (
    <section className={styles.card}>
      <h2>Nuevo pedido</h2>

      <form className={styles.formStack} onSubmit={crearPedido}>
        <div className={styles.field}>
          <span>Cliente</span>
          {cliente ? (
            <div className={styles.selected}>
              <strong>{cliente.nombre}</strong>
              <span className={styles.muted}>
                NIT {cliente.nit} · {cliente.telefono}
              </span>
              <button className={styles.link} type="button" onClick={() => setCliente(null)}>
                cambiar
              </button>
            </div>
          ) : (
            <>
              <input
                type="search"
                placeholder="Buscar por nombre, NIT o teléfono"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
              <ul className={styles.clientList}>
                {coincidencias.map((c) => (
                  <li key={c.id}>
                    <button type="button" className={styles.clientOption} onClick={() => elegirCliente(c)}>
                      <strong>{c.nombre}</strong>
                      <span className={styles.muted}>
                        NIT {c.nit} · {c.telefono}
                      </span>
                    </button>
                  </li>
                ))}
                {coincidencias.length === 0 && (
                  <li className={styles.muted}>No hay clientes que coincidan.</li>
                )}
              </ul>
              <button
                className={styles.link}
                type="button"
                onClick={() => setCreandoCliente((abierto) => !abierto)}
              >
                {creandoCliente ? 'Cancelar nuevo cliente' : '+ Crear cliente nuevo'}
              </button>
            </>
          )}
        </div>

        <div className={styles.field}>
          <span>Entrega</span>
          <div className={styles.chips}>
            {(Object.keys(TIPO_ENTREGA_ID) as TipoEntregaNombre[]).map((nombre) => (
              <button
                key={nombre}
                type="button"
                className={nombre === tipo ? styles.chipActive : styles.chip}
                aria-pressed={nombre === tipo}
                onClick={() => elegirTipo(nombre)}
              >
                {nombre}
              </button>
            ))}
          </div>
        </div>

        {tipo === 'Domicilio' && (
          <label className={styles.field}>
            <span>Dirección de entrega</span>
            <input type="text" value={direccion} onChange={(e) => setDireccion(e.target.value)} />
          </label>
        )}

        <div className={styles.formRow}>
          <button className={styles.primary} type="submit" disabled={enviando || !cliente}>
            {enviando ? 'Creando…' : 'Crear pedido'}
          </button>
          <button className={styles.secondary} type="button" onClick={onCancelar}>
            Cancelar
          </button>
        </div>
      </form>

      {creandoCliente && !cliente && (
        <form className={styles.subCard} onSubmit={crearCliente}>
          <h3>Cliente nuevo</h3>
          <div className={styles.formRow}>
            <label className={`${styles.field} ${styles.grow}`}>
              <span>Nombre</span>
              <input value={nuevo.nombre} onChange={(e) => campoNuevo('nombre', e.target.value)} required />
            </label>
            <label className={styles.field}>
              <span>NIT / CI</span>
              <input value={nuevo.nit} onChange={(e) => campoNuevo('nit', e.target.value)} required />
            </label>
          </div>
          <div className={styles.formRow}>
            <label className={styles.field}>
              <span>Teléfono</span>
              <input value={nuevo.telefono} onChange={(e) => campoNuevo('telefono', e.target.value)} required />
            </label>
            <label className={`${styles.field} ${styles.grow}`}>
              <span>Dirección</span>
              <input value={nuevo.direccion} onChange={(e) => campoNuevo('direccion', e.target.value)} required />
            </label>
          </div>
          <label className={styles.field}>
            <span>Correo (opcional)</span>
            <input type="email" value={nuevo.correo} onChange={(e) => campoNuevo('correo', e.target.value)} />
          </label>
          <div className={styles.formRow}>
            <button className={styles.primary} type="submit" disabled={enviando}>
              {enviando ? 'Guardando…' : 'Guardar cliente'}
            </button>
          </div>
        </form>
      )}
    </section>
  )
}