import { useState } from 'react'
import type { Cliente, Combo, Pedido } from '../../api.ts'
import { formatearMonto } from '../../utils/formato.ts'
import { DetalleItems } from '../pedidos/DetalleItems.tsx'
import { TIPO_ENTREGA_ID, type TipoEntregaNombre } from '../pedidos/estados.ts'
import base from '../pedidos/Pedidos.module.css'
import { SelectorCliente } from './SelectorCliente.tsx'
import { esMostrador } from './useCaja.ts'
import styles from './Caja.module.css'

interface Props {
  pedido: Pedido
  combos: Combo[]
  clientes: Cliente[]
  cliente: Cliente | null
  mostrador: Cliente
  tipo: TipoEntregaNombre
  direccion: string
  proximaFicha: number
  ocupado: boolean
  onTipo: (tipo: TipoEntregaNombre) => void
  onDireccion: (direccion: string) => void
  onElegirCliente: (cliente: Cliente) => void
  onClienteCreado: (cliente: Cliente) => void
  onQuitarDetalle: (detalleId: number) => void
  onQuitarExtra: (detalleId: number, extraId: number) => void
  onCobrar: () => void
  onDescartar: () => void
}

export function TicketCaja({
  pedido,
  combos,
  clientes,
  cliente,
  mostrador,
  tipo,
  direccion,
  proximaFicha,
  ocupado,
  onTipo,
  onDireccion,
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

  function elegir(elegido: Cliente) {
    onElegirCliente(elegido)
    setEligiendo(false)
  }

  return (
    <section className={`${base.card} ${styles.ticket}`} aria-label="Pedido en curso">
      <div className={base.headerRow}>
        <h2>Pedido nuevo</h2>
        <span className={styles.ficha}>
          Ficha <strong>{proximaFicha}</strong>
        </span>
      </div>

      <div className={base.chips} role="group" aria-label="Tipo de entrega">
        {(Object.keys(TIPO_ENTREGA_ID) as TipoEntregaNombre[]).map((nombre) => (
          <button
            key={nombre}
            type="button"
            className={nombre === tipo ? base.chipActive : base.chip}
            aria-pressed={nombre === tipo}
            onClick={() => onTipo(nombre)}
          >
            {nombre}
          </button>
        ))}
      </div>

      {esDomicilio && (
        <label className={base.field}>
          <span>Dirección de entrega</span>
          <input
            type="text"
            value={direccion}
            placeholder="Calle, número, zona"
            onChange={(e) => onDireccion(e.target.value)}
          />
        </label>
      )}

      <div className={styles.cliente}>
        <span className={base.muted}>Cliente</span>
        <span>
          <strong>{cliente?.nombre ?? '—'}</strong>
          {cliente && !esMostrador(cliente) && cliente.telefono ? (
            <span className={base.muted}> · Tel. {cliente.telefono}</span>
          ) : null}
          <button className={base.link} type="button" onClick={() => setEligiendo((v) => !v)}>
            {eligiendo ? 'cerrar' : 'cambiar'}
          </button>
        </span>
      </div>

      {eligiendo && (
        <div className={styles.selector}>
          {cliente && !esMostrador(cliente) && (
            <button className={base.secondary} type="button" onClick={() => elegir(mostrador)}>
              Volver a Mostrador
            </button>
          )}
          <SelectorCliente
            clientes={clientes}
            requiereTelefono={esDomicilio}
            onElegir={elegir}
            onCreado={onClienteCreado}
            onCerrar={() => setEligiendo(false)}
          />
        </div>
      )}

      <DetalleItems
        detalles={pedido.detalles}
        total={pedido.total}
        combos={combos}
        editable
        onQuitarExtra={onQuitarExtra}
        onQuitarDetalle={onQuitarDetalle}
      />

      <button
        className={`${base.primary} ${styles.cobrar}`}
        type="button"
        disabled={ocupado}
        onClick={onCobrar}
      >
        {vacio ? 'Cobrar' : `Cobrar ${formatearMonto(pedido.total)} y enviar a cocina`}
      </button>

      {!vacio && (
        <button className={base.link} type="button" disabled={ocupado} onClick={onDescartar}>
          Descartar este pedido
        </button>
      )}
    </section>
  )
}
