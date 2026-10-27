import { useEffect, useState } from 'react'
import { pedidosApi, repartidoresApi } from '../../api.ts'
import type { Cliente, CobroResultado, PagoCobro, Repartidor } from '../../api.ts'
import { useToast } from '../../toast/toast-context.ts'
import { AgregarItemPanel } from '../pedidos/AgregarItemPanel.tsx'
import { TIPO_ENTREGA_ID, type TipoEntregaNombre } from '../pedidos/estados.ts'
import base from '../pedidos/Pedidos.module.css'
import type { Catalogo } from '../pedidos/useCatalogo.ts'
import { useCatalogo } from '../pedidos/useCatalogo.ts'
import { FichaConfirmada } from './FichaConfirmada.tsx'
import { PanelCobro } from './PanelCobro.tsx'
import { TicketCaja } from './TicketCaja.tsx'
import { esMostrador, useCaja, type CajaApi } from './useCaja.ts'
import { formatearMonto, parseMonto } from '../../utils/formato.ts'
import styles from './Caja.module.css'

interface Props {
  usuarioId: number
  turnoId: number
  /** Se llama cuando cambia algo que otras pantallas muestran (cobrar, descartar). */
  onCambio: () => void
}

interface EnCursoProps {
  estado: NonNullable<CajaApi['estado']>
  caja: CajaApi
  catalogo: Catalogo | null
  errorCatalogo: string | null
  onCobrado: (resultado: CobroResultado) => void
  onCambio: () => void
}

const CLAVE_ULTIMO_ENVIO = 'pizzeria.ultimoEnvio'

/** El último costo de envío que escribió el cajero: se ofrece como sugerencia (editable). */
function ultimoEnvio(): string {
  try {
    return localStorage.getItem(CLAVE_ULTIMO_ENVIO) ?? ''
  } catch {
    return ''
  }
}

function recordarEnvio(costo: number): void {
  try {
    if (costo > 0) localStorage.setItem(CLAVE_ULTIMO_ENVIO, String(costo))
  } catch {
    // Sin almacenamiento disponible: simplemente no se recuerda.
  }
}

/** Un cliente sirve para domicilio si se le puede llamar. */
function tieneTelefono(cliente: Cliente): boolean {
  const telefono = cliente.telefono.trim()
  return !esMostrador(cliente) && telefono !== '' && telefono !== '0'
}

function PedidoEnCurso({ estado, caja, catalogo, errorCatalogo, onCobrado, onCambio }: EnCursoProps) {
  const toast = useToast()
  const { borrador, clientes, mostrador, metodos, proximaFicha } = estado

  const [tipo, setTipo] = useState<TipoEntregaNombre>(
    borrador.tipo_entrega?.nombre === 'Domicilio' ? 'Domicilio' : 'Local',
  )
  const [direccion, setDireccion] = useState(borrador.direccion_entrega ?? '')
  const [costoEnvio, setCostoEnvio] = useState(borrador.costo_envio > 0 ? String(borrador.costo_envio) : '')
  const [repartidorId, setRepartidorId] = useState<number | null>(borrador.repartidor_id)
  const [repartidores, setRepartidores] = useState<Repartidor[]>([])
  const [cobrando, setCobrando] = useState(false)
  const [ocupado, setOcupado] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    repartidoresApi
      .listar(false, { signal: controller.signal })
      .then(setRepartidores)
      .catch(() => {
        // Sin la lista el cajero igual puede cobrar: el repartidor es opcional.
      })
    return () => controller.abort()
  }, [])

  const cliente = clientes.find((c) => c.id === borrador.cliente_id) ?? null
  const unidades = borrador.detalles.reduce((suma, d) => suma + d.cantidad, 0)
  // El envío se guarda al cobrar; mientras tanto el total se muestra con lo escrito en pantalla.
  const envioMostrado = tipo === 'Domicilio' ? (parseMonto(costoEnvio) ?? 0) : 0
  const totalMostrado = borrador.detalles.reduce((suma, d) => suma + d.subtotal, 0) + envioMostrado

  /** La dirección del cliente se ofrece sola en domicilio, si todavía no escribieron una. */
  function sugerirDireccion(deCliente: Cliente | null, paraTipo: TipoEntregaNombre) {
    if (paraTipo !== 'Domicilio' || direccion.trim() !== '' || !deCliente) return
    const guardada = deCliente.direccion.trim()
    if (guardada !== '' && guardada !== '-') setDireccion(guardada)
  }

  function elegirTipo(siguiente: TipoEntregaNombre) {
    setTipo(siguiente)
    sugerirDireccion(cliente, siguiente)
    if (siguiente === 'Domicilio' && costoEnvio.trim() === '') setCostoEnvio(ultimoEnvio())
  }

  async function elegirCliente(elegido: Cliente) {
    try {
      caja.actualizarBorrador(await pedidosApi.actualizar(borrador.id, { cliente_id: elegido.id }))
      sugerirDireccion(elegido, tipo)
    } catch (e) {
      toast.error(e)
    }
  }

  async function refrescar() {
    try {
      await caja.refrescar()
    } catch (e) {
      toast.error(e)
    }
  }

  async function quitarDetalle(detalleId: number) {
    try {
      caja.actualizarBorrador(await pedidosApi.quitarDetalle(borrador.id, detalleId))
    } catch (e) {
      toast.error(e)
      await refrescar()
    }
  }

  async function quitarExtra(detalleId: number, extraId: number) {
    try {
      await pedidosApi.quitarExtra(borrador.id, detalleId, extraId)
    } catch (e) {
      toast.error(e)
    }
    await refrescar()
  }

  async function descartar() {
    if (!window.confirm('¿Descartar este pedido? Se borran todos sus productos.')) return
    setOcupado(true)
    try {
      await pedidosApi.eliminar(borrador.id)
      toast.exito('Pedido descartado')
      onCambio()
      caja.recargar()
    } catch (e) {
      toast.error(e)
      setOcupado(false)
    }
  }

  async function iniciarCobro() {
    if (borrador.detalles.length === 0) return toast.error('Agrega productos al pedido antes de cobrar')
    let envio = 0
    if (tipo === 'Domicilio') {
      if (direccion.trim() === '') return toast.error('Escribe la dirección de entrega')
      if (!cliente || !tieneTelefono(cliente)) {
        return toast.error('Para un domicilio elige un cliente con teléfono')
      }
      const escrito = parseMonto(costoEnvio)
      if (costoEnvio.trim() !== '' && escrito === null) {
        return toast.error('El costo de envío no es un número válido')
      }
      envio = escrito ?? 0
    }

    // El servidor cobra lo que tiene guardado: se guarda la entrega y el envío antes de mostrar el total.
    setOcupado(true)
    try {
      const guardado = await pedidosApi.actualizar(borrador.id, {
        tipo_entrega_id: TIPO_ENTREGA_ID[tipo],
        direccion_entrega: tipo === 'Domicilio' ? direccion.trim() : null,
        ...(tipo === 'Domicilio' ? { costo_envio: envio, repartidor_id: repartidorId } : {}),
      })
      caja.actualizarBorrador(guardado)
      recordarEnvio(envio)
      setCobrando(true)
    } catch (e) {
      toast.error(e)
      await refrescar()
    } finally {
      setOcupado(false)
    }
  }

  async function confirmarCobro(pagos: PagoCobro[], minutosEspera?: number) {
    setOcupado(true)
    try {
      // El cobro no recibe la entrega: se guarda antes, solo si cambió.
      const entregaActual: string = borrador.tipo_entrega?.nombre ?? 'Local'
      const direccionLimpia = direccion.trim()
      const cambioEntrega =
        tipo !== entregaActual ||
        (tipo === 'Domicilio' && direccionLimpia !== (borrador.direccion_entrega ?? ''))
      if (cambioEntrega) {
        await pedidosApi.actualizar(borrador.id, {
          tipo_entrega_id: TIPO_ENTREGA_ID[tipo],
          direccion_entrega: tipo === 'Domicilio' ? direccionLimpia : null,
        })
      }
      onCobrado(await pedidosApi.cobrar(borrador.id, { pagos, minutos_espera: minutosEspera }))
    } catch (e) {
      toast.error(e)
      // Puede haber cambiado algo en el servidor (stock, turno cerrado): se vuelve a leer el pedido.
      await refrescar()
      setOcupado(false)
    }
  }

  if (cobrando) {
    return (
      <PanelCobro
        total={borrador.total}
        metodos={metodos}
        ocupado={ocupado}
        tipo={tipo}
        onConfirmar={confirmarCobro}
        onVolver={() => setCobrando(false)}
      />
    )
  }

  return (
    <>
      <div className={styles.layout}>
        <div className={styles.menu}>
          {catalogo && (
            <AgregarItemPanel
              pedidoId={borrador.id}
              catalogo={catalogo}
              onAgregado={refrescar}
              silencioso
            />
          )}
          {!catalogo && !errorCatalogo && <p className={base.muted}>Cargando el menú…</p>}
          {errorCatalogo && (
            <p className={base.error} role="alert">
              No se pudo cargar el menú: {errorCatalogo}
            </p>
          )}
        </div>

        <TicketCaja
          pedido={borrador}
          combos={catalogo?.combos ?? []}
          clientes={clientes}
          cliente={cliente}
          mostrador={mostrador}
          tipo={tipo}
          direccion={direccion}
          costoEnvio={costoEnvio}
          repartidorId={repartidorId}
          repartidores={repartidores}
          totalMostrado={totalMostrado}
          envioMostrado={envioMostrado}
          proximaFicha={proximaFicha}
          ocupado={ocupado}
          onTipo={elegirTipo}
          onDireccion={setDireccion}
          onCostoEnvio={setCostoEnvio}
          onRepartidor={setRepartidorId}
          onRepetido={refrescar}
          onElegirCliente={elegirCliente}
          onClienteCreado={caja.agregarCliente}
          onQuitarDetalle={quitarDetalle}
          onQuitarExtra={quitarExtra}
          onCobrar={iniciarCobro}
          onDescartar={descartar}
        />
      </div>

      <div className={styles.barraMovil}>
        <span>
          {unidades} {unidades === 1 ? 'producto' : 'productos'} · <strong>{formatearMonto(totalMostrado)}</strong>
        </span>
        <button className={base.primary} type="button" disabled={ocupado} onClick={iniciarCobro}>
          Cobrar
        </button>
      </div>
    </>
  )
}

export function Caja({ usuarioId, turnoId, onCambio }: Props) {
  const caja = useCaja(usuarioId, turnoId)
  const { catalogo, error: errorCatalogo } = useCatalogo()
  const [cobrado, setCobrado] = useState<CobroResultado | null>(null)

  if (cobrado) {
    return (
      <FichaConfirmada
        resultado={cobrado}
        onNuevo={() => {
          setCobrado(null)
          caja.recargar()
        }}
      />
    )
  }

  if (caja.error) {
    return (
      <div className={base.errorRow}>
        <p className={base.error} role="alert">
          {caja.error}
        </p>
        <button className={base.secondary} type="button" onClick={caja.recargar}>
          Reintentar
        </button>
      </div>
    )
  }

  if (!caja.estado) return <p className={base.muted}>Preparando la caja…</p>

  return (
    <PedidoEnCurso
      key={caja.estado.borrador.id}
      estado={caja.estado}
      caja={caja}
      catalogo={catalogo}
      errorCatalogo={errorCatalogo}
      onCobrado={(resultado) => {
        setCobrado(resultado)
        onCambio()
      }}
      onCambio={onCambio}
    />
  )
}
