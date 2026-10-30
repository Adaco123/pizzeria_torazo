import type { Pedido } from '../apis/pedidos.ts'
import { aFecha } from './formato.ts'

const NOMBRE_NEGOCIO = 'El Torazo'
const horaCorta = new Intl.DateTimeFormat('es-BO', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: 'America/La_Paz',
})

/**
 * Número en el formato que pide WhatsApp (solo dígitos, con código de país), o null si el
 * teléfono no sirve. En Bolivia: 8 dígitos que empiezan con 6 o 7 son celular → se agrega 591.
 */
export function telefonoParaWhatsapp(telefono: string | null | undefined): string | null {
  const digitos = (telefono ?? '').replace(/\D/g, '')
  if (/^[67]\d{7}$/.test(digitos)) return `591${digitos}`
  if (/^591[67]\d{7}$/.test(digitos)) return digitos
  return null
}

export function enlaceWhatsapp(telefono: string | null | undefined, texto: string): string | null {
  const numero = telefonoParaWhatsapp(telefono)
  return numero === null ? null : `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`
}

/** El mensaje que corresponde al momento del pedido, o null si todavía no hay nada que avisar. */
export function mensajeDePedido(pedido: Pedido, nombreCliente: string | null): string | null {
  const estado = pedido.estado?.nombre
  const saludo = nombreCliente && nombreCliente.toLowerCase() !== 'mostrador' ? `Hola ${nombreCliente}, ` : 'Hola, '
  const ficha = pedido.numero_turno ? ` (ficha ${pedido.numero_turno})` : ''
  const domicilio = pedido.tipo_entrega?.nombre === 'Domicilio'

  if (estado === 'confirmado' || estado === 'en_preparacion') {
    const hora = pedido.hora_prometida ? ` Te lo prometemos para las ${horaCorta.format(aFecha(pedido.hora_prometida))}.` : ''
    return `${saludo}recibimos tu pedido${ficha} en ${NOMBRE_NEGOCIO}. Ya lo estamos preparando.${hora}`
  }
  if (estado === 'listo') {
    if (domicilio) {
      const quien = pedido.repartidor ? ` con ${pedido.repartidor.nombre}` : ''
      return `${saludo}tu pedido${ficha} de ${NOMBRE_NEGOCIO} ya salió a tu domicilio${quien}. ¡Buen provecho!`
    }
    return `${saludo}tu pedido${ficha} de ${NOMBRE_NEGOCIO} ya está listo para recoger. ¡Te esperamos!`
  }
  return null
}
