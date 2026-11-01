import { Bike, ChevronDown, UtensilsCrossed } from 'lucide-react'
import { useState } from 'react'
import type { Cliente } from '../../apis/clientes.ts'
import type { Combo } from '../../apis/combos.ts'
import type { Pedido } from '../../apis/pedidos.ts'
import type { Repartidor } from '../../apis/repartidores.ts'
import { formatearMonto } from '../../utils/formato.ts'
import type { TipoEntregaNombre } from '../pedidos/estados.ts'
import { CarritoItems } from './CarritoItems.tsx'
import { ClienteFrecuente } from './ClienteFrecuente.tsx'
import { DescuentoCaja } from './DescuentoCaja.tsx'
import { Hoja } from './Hoja.tsx'
import { SelectorCliente } from './SelectorCliente.tsx'
import { esMostrador } from './useCaja.ts'
import styles from './Ticket.module.css'

interface Props {
  pedido: Pedido
  combos: Combo[]
  clientes: Cliente[]
  cliente: Cliente | null
  mostrador: Cliente
  tipo: TipoEntregaNombre
  direccion: string
  /** Lo escrito en «Costo de envío» (solo domicilio). */
  costoEnvio: string
  repartidorId: number | null
  repartidores: Repartidor[]
  /** Lo que va a pagar el cliente, con el envío que todavía no se guardó. */
  totalMostrado: number
  envioMostrado: number
  proximaFicha: number
  ocupado: boolean
  /** Celular: el carrito es un cajón que sube desde abajo. */
  abierto: boolean
  onCerrarCajon: () => void
  onTipo: (tipo: TipoEntregaNombre) => void
  onDireccion: (direccion: string) => void
  onCostoEnvio: (costo: string) => void
  onRepartidor: (id: number | null) => void
  onRepetido: () => Promise<void> | void
  onPedidoCambiado: (pedido: Pedido) => void
  onElegirCliente: (cliente: Cliente) => void
  onClienteCreado: (cliente: Cliente) => void
  onQuitarDetalle: (detalleId: number) => void
  onQuitarExtra: (detalleId: number, extraId: number) => void
  onCobrar: () => void
  onDescartar: () => void
}

/** Un cliente sirve para domicilio si se le puede llamar. */
function sePuedeLlamar(cliente: Cliente | null): boolean {
  if (!cliente || esMostrador(cliente)) return false
  const telefono = cliente.telefono.trim()
  return telefono !== '' && telefono !== '0'
}

export function TicketCaja({
  pedido,
  combos,
  clientes,
  cliente,
  mostrador,
  tipo,
  direccion,
  costoEnvio,
  repartidorId,
  repartidores,
  totalMostrado,
  envioMostrado,
  proximaFicha,
  ocupado,
  abierto,
  onCerrarCajon,
  onTipo,
  onDireccion,
  onCostoEnvio,
  onRepartidor,
  onRepetido,
  onPedidoCambiado,
  onElegirCliente,
  onClienteCreado,
  onQuitarDetalle,
  onQuitarExtra,
  onCobrar,
  onDescartar,
}: Props) {
  const [eligiendo, setEligiendo] = useState(false)
  const vacio = pedido.detalles.length === 0
  const esDomicilio = tipo === 'Domicilio'
  const subtotal = pedido.detalles.reduce((s, d) => s + d.subtotal, 0)
  const nombreCliente = cliente?.nombre ?? '—'
  const real = cliente !== null && !esMostrador(cliente)

  function elegir(elegido: Cliente) {
    onElegirCliente(elegido)
    setEligiendo(false)
  }

  return (
    <aside className={`${styles.ticket} ${abierto ? styles.abierto : ''}`} aria-label="Pedido en curso">
      <button type="button" className={styles.agarre} aria-label="Cerrar el pedido" onClick={onCerrarCajon}>
        <ChevronDown size={22} aria-hidden="true" />
      </button>

      <div className={styles.cabeza}>
        <h2>
          Pedido <b>#{proximaFicha}</b>
        </h2>
        <div className={styles.segmento} role="group" aria-label="Tipo de entrega">
          <button type="button" aria-pressed={!esDomicilio} onClick={() => onTipo('Local')}>
            <UtensilsCrossed size={15} aria-hidden="true" /> Local
          </button>
          <button type="button" aria-pressed={esDomicilio} onClick={() => onTipo('Domicilio')}>
            <Bike size={15} aria-hidden="true" /> Domicilio
          </button>
        </div>
      </div>

      <div className={styles.datos}>
        <div className={styles.cliente}>
          <span className={styles.avatar} aria-hidden="true">
            {nombreCliente.charAt(0).toUpperCase()}
          </span>
          <div>
            <b>{nombreCliente}</b>
            <small>{real && cliente.telefono ? `Tel. ${cliente.telefono}` : 'Venta rápida'}</small>
          </div>
          <button type="button" onClick={() => setEligiendo(true)}>
            Cambiar
          </button>
        </div>

        {real && (
          <ClienteFrecuente
            key={cliente.id}
            cliente={cliente}
            pedidoId={pedido.id}
            hayProductos={!vacio}
            ocupado={ocupado}
            onRepetido={onRepetido}
          />
        )}

        {esDomicilio && (
          <div className={styles.domicilio}>
            <input
              className={styles.direccion}
              value={direccion}
              placeholder="Dirección de entrega"
              aria-label="Dirección de entrega"
              autoComplete="off"
              onChange={(e) => onDireccion(e.target.value)}
            />
            <label className={styles.envio}>
              <span>Bs</span>
              <input
                inputMode="decimal"
                value={costoEnvio}
                placeholder="Envío"
                aria-label="Costo de envío"
                onChange={(e) => onCostoEnvio(e.target.value)}
              />
            </label>
            <select
              value={repartidorId ?? ''}
              aria-label="Repartidor"
              onChange={(e) => onRepartidor(e.target.value === '' ? null : Number(e.target.value))}
            >
              <option value="">Repartidor</option>
              {repartidores.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.nombre}
                  {r.tipo === 'empresa' ? ' (empresa)' : ''}
                </option>
              ))}
            </select>
            {!sePuedeLlamar(cliente) && (
              <p className={styles.aviso}>Para domicilio elige un cliente con teléfono.</p>
            )}
          </div>
        )}
      </div>

      <div className={styles.items}>
        <CarritoItems
          detalles={pedido.detalles}
          combos={combos}
          onQuitarDetalle={onQuitarDetalle}
          onQuitarExtra={onQuitarExtra}
        />
      </div>

      <div className={styles.pie}>
        <div className={styles.fila}>
          <span>Subtotal</span>
          <span>{formatearMonto(subtotal)}</span>
        </div>
        <DescuentoCaja pedido={pedido} ocupado={ocupado} onCambio={onPedidoCambiado} />
        {esDomicilio && envioMostrado > 0 && (
          <div className={styles.fila}>
            <span>Envío{repartidores.find((r) => r.id === repartidorId)?.nombre ? ` · ${repartidores.find((r) => r.id === repartidorId)?.nombre}` : ''}</span>
            <span>{formatearMonto(envioMostrado)}</span>
          </div>
        )}
        <div className={`${styles.fila} ${styles.total}`}>
          <span>Total</span>
          <span>{formatearMonto(totalMostrado)}</span>
        </div>
        <button type="button" className={styles.cobrar} disabled={ocupado || vacio} onClick={onCobrar}>
          {vacio ? 'Cobrar' : `Cobrar ${formatearMonto(totalMostrado)}`}
        </button>
        {!vacio && (
          <button type="button" className={styles.descartar} disabled={ocupado} onClick={onDescartar}>
            Descartar este pedido
          </button>
        )}
      </div>

      {eligiendo && (
        <Hoja titulo="Cliente" onCerrar={() => setEligiendo(false)}>
          <SelectorCliente
            clientes={clientes}
            requiereTelefono={esDomicilio}
            puedeVolverAMostrador={real}
            onElegir={elegir}
            onMostrador={() => elegir(mostrador)}
            onCreado={onClienteCreado}
          />
        </Hoja>
      )}
    </aside>
  )
}
