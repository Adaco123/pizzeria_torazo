"""Mesas y cuentas de mesa: varias rondas de pedidos que se cobran juntas al final."""
from datetime import datetime, timedelta

from app.db import db
from app.mesas.models import CuentaMesa, Mesa
from app.pagos.models import MetodoPago, Pago
from app.pedidos import servicio as pedidos
from app.pedidos.models import Pedido
from app.pedidos.servicio import ReglaNegocio, TOLERANCIA
from app.turnos.models import Turno
from app.users.models import ROL_ADMINISTRADOR, ROL_CAJERO, ROL_MESERO, Role

ROLES_DE_SALA = (ROL_MESERO, ROL_CAJERO, ROL_ADMINISTRADOR)
MAX_NUMERO_MESA = 999
ESTADOS_COBRABLES = {'confirmado', 'en_preparacion', 'listo', 'entregado'}


def asegurar_rol_mesero():
    if not Role.query.filter_by(nombre=ROL_MESERO).first():
        db.session.add(Role(nombre=ROL_MESERO))
        db.session.commit()


# ---------------------------------------------------------------------------
# Mesas
# ---------------------------------------------------------------------------
def cuenta_abierta_de(mesa):
    return CuentaMesa.query.filter_by(mesa_id=mesa.id, estado='abierta').first()


def validar_numero(valor, excepto_id=None):
    if isinstance(valor, bool) or not isinstance(valor, int) or not 1 <= valor <= MAX_NUMERO_MESA:
        raise ReglaNegocio(f'El número de mesa debe ser un entero entre 1 y {MAX_NUMERO_MESA}', 400)
    otra = Mesa.query.filter_by(numero=valor).first()
    if otra and otra.id != excepto_id:
        raise ReglaNegocio(f'Ya existe la mesa {valor}', 409)
    return valor


# ---------------------------------------------------------------------------
# Cuenta
# ---------------------------------------------------------------------------
def turno_para_abrir():
    """Turno al que van las ventas de la mesa: el del cajero si abre él; si abre un mesero
    o el admin, el turno abierto más reciente (el de la caja que está atendiendo)."""
    usuario = pedidos.usuario_actual()
    consulta = Turno.query.filter(Turno.cierre.is_(None))
    if pedidos.rol_actual() == ROL_CAJERO:
        consulta = consulta.filter(Turno.usuario_id == usuario.id)
    turno = consulta.order_by(Turno.apertura.desc()).first()
    if turno is None:
        raise ReglaNegocio('No hay un turno abierto: abre el turno de caja antes de abrir mesas', 409)
    return turno


def abrir_cuenta(mesa):
    pedidos.exigir_rol(*ROLES_DE_SALA)
    if not mesa.activa:
        raise ReglaNegocio(f'La mesa {mesa.numero} está desactivada', 409)
    if cuenta_abierta_de(mesa):
        raise ReglaNegocio(f'La mesa {mesa.numero} ya tiene una cuenta abierta', 409)
    cuenta = CuentaMesa(mesa.id, turno_para_abrir().id, pedidos.usuario_actual().id)
    db.session.add(cuenta)
    db.session.commit()
    return cuenta


def exigir_cuenta_abierta(cuenta):
    if not cuenta.abierta:
        raise ReglaNegocio('La cuenta de esta mesa ya está cerrada', 409)


def rondas_vigentes(cuenta):
    """Rondas que cuentan: las canceladas no."""
    return [p for p in cuenta.pedidos if pedidos.estado_de(p) != 'cancelado']


def rondas_enviadas(cuenta):
    return [p for p in rondas_vigentes(cuenta) if pedidos.estado_de(p) != 'pendiente']


def total_de_cuenta(cuenta):
    return round(sum(p.total for p in rondas_enviadas(cuenta)), 2)


def nueva_ronda(cuenta):
    """Borrador para ir armando lo que pide la mesa. Si ya hay uno vacío o a medias, se reutiliza."""
    pedidos.exigir_rol(*ROLES_DE_SALA)
    exigir_cuenta_abierta(cuenta)
    pedidos.exigir_turno_abierto(cuenta.turno)
    usuario = pedidos.usuario_actual()
    for p in cuenta.pedidos:
        if pedidos.estado_de(p) == 'pendiente' and p.usuario_id == usuario.id:
            return p, False
    pedidos.asegurar_estados_por_defecto()
    from app.pedidos.models import TipoEntrega
    local = TipoEntrega.query.filter_by(nombre='Local').first()
    if local is None:
        local = TipoEntrega('Local')
        db.session.add(local)
        db.session.flush()
    ronda = Pedido(tipo_entrega_id=local.id, usuario_id=usuario.id, turno_id=cuenta.turno_id)
    ronda.cuenta_id = cuenta.id
    db.session.add(ronda)
    db.session.commit()
    return ronda, True


def enviar_a_cocina(pedido):
    """Manda la ronda a cocina sin cobrarla (se cobra con la cuenta de la mesa)."""
    pedidos.exigir_rol(*ROLES_DE_SALA)
    pedidos.exigir_acceso_pedido(pedido)
    if not pedido.cuenta_id:
        raise ReglaNegocio('Solo las rondas de una mesa se envían a cocina sin cobrar', 409)
    exigir_cuenta_abierta(pedido.cuenta)
    if pedidos.estado_de(pedido) != 'pendiente':
        raise ReglaNegocio('Esta ronda ya fue enviada a cocina', 409)
    pedidos.exigir_turno_abierto(pedido.turno)
    if not pedido.detalles:
        raise ReglaNegocio('Agrega productos a la ronda antes de enviarla', 400)
    pedidos.recalcular_total(pedido)
    pedidos.exigir_productos_disponibles(pedido)
    pedidos.asignar_ficha(pedido)
    pedidos.descontar_stock(pedido)
    pedido.hora_prometida = datetime.utcnow() + timedelta(
        minutes=pedidos.minutos_espera_por_defecto(pedido))
    pedidos.cambiar_estado(pedido, 'confirmado')
    db.session.commit()
    return pedido


def pedir_cuenta(cuenta, pidio=True):
    pedidos.exigir_rol(*ROLES_DE_SALA)
    exigir_cuenta_abierta(cuenta)
    cuenta.pidio_cuenta = bool(pidio)
    db.session.commit()
    return cuenta


def _exigir_puede_cobrar(cuenta):
    pedidos.exigir_rol(ROL_CAJERO, ROL_ADMINISTRADOR)
    if not pedidos.es_admin() and cuenta.turno.usuario_id != pedidos.usuario_actual().id:
        raise ReglaNegocio('Esta mesa se abrió en el turno de otro cajero', 403)


def _descartar_borradores_vacios(cuenta):
    """Borradores sin productos no estorban. Uno con productos sí: falta enviarlo o quitarlo."""
    for p in list(cuenta.pedidos):
        if pedidos.estado_de(p) != 'pendiente':
            continue
        if p.detalles:
            raise ReglaNegocio(
                'Hay una ronda sin enviar a cocina: envíala o quítale los productos antes de cobrar', 409)
        db.session.delete(p)
    db.session.flush()
    db.session.expire(cuenta, ['pedidos'])


def _poner_descuento(rondas, descuento):
    tipo = descuento.get('tipo')
    valor = descuento.get('valor')
    motivo = (descuento.get('motivo') or '').strip()
    if tipo not in pedidos.TIPOS_DESCUENTO:
        raise ReglaNegocio('El descuento es un porcentaje o un monto en Bs', 400)
    if isinstance(valor, bool) or not isinstance(valor, (int, float)) or valor != valor or valor <= 0:
        raise ReglaNegocio('El descuento debe ser un número mayor a 0', 400)
    if not motivo:
        raise ReglaNegocio('Escribe el motivo del descuento', 400)
    if len(motivo) > 200:
        raise ReglaNegocio('El motivo es demasiado largo (máximo 200 letras)', 400)

    productos = [round(sum(d.subtotal for d in r.detalles), 2) for r in rondas]
    total_productos = round(sum(productos), 2)
    if tipo == 'porcentaje' and valor > 100:
        raise ReglaNegocio('El porcentaje no puede pasar de 100', 400)
    if tipo == 'monto' and valor > total_productos + TOLERANCIA:
        raise ReglaNegocio(f'El descuento no puede ser mayor a los productos (Bs {total_productos:.2f})', 400)

    # Siempre se reparte como monto en Bs: así el descuento total es exactamente el que se muestra
    # en pantalla (porcentaje del total, redondeado una sola vez) y no varía por redondear ronda a ronda.
    en_bs = round(total_productos * valor / 100, 2) if tipo == 'porcentaje' else round(valor, 2)
    if not pedidos.es_admin() and en_bs > total_productos * pedidos.TOPE_DESCUENTO_CAJERO / 100 + TOLERANCIA:
        raise ReglaNegocio(
            f'Un cajero da hasta {pedidos.TOPE_DESCUENTO_CAJERO}% de descuento. '
            'Para más, pide al administrador', 403)

    quien = pedidos.usuario_actual().id
    repartido = 0.0
    for i, ronda in enumerate(rondas):
        parte = round(en_bs * productos[i] / total_productos, 2) if i < len(rondas) - 1 \
            else round(en_bs - repartido, 2)
        repartido += parte
        ronda.descuento_tipo = 'monto'
        ronda.descuento_valor = parte
        ronda.descuento_motivo = motivo
        ronda.descuento_usuario_id = quien
        pedidos.recalcular_total(ronda)


def cobrar_cuenta(cuenta, pagos_data, descuento=None):
    """Cobra todas las rondas de la mesa en una sola vez y cierra la cuenta.

    `pagos_data`: lista de {metodo_id, monto, monto_recibido}; la suma debe igualar el total.
    Cada pago se reparte entre las rondas, así cada ronda queda pagada y los reportes no cambian.
    Devuelve el vuelto total.
    """
    _exigir_puede_cobrar(cuenta)
    exigir_cuenta_abierta(cuenta)
    pedidos.exigir_turno_abierto(cuenta.turno)
    _descartar_borradores_vacios(cuenta)

    rondas = rondas_enviadas(cuenta)
    if not rondas:
        raise ReglaNegocio('La mesa no tiene pedidos que cobrar: si no consumieron, anula la cuenta', 409)
    for r in rondas:
        if pedidos.estado_de(r) not in ESTADOS_COBRABLES:
            raise ReglaNegocio('Hay rondas en un estado que no se puede cobrar', 409)

    for r in rondas:
        pedidos.recalcular_total(r)
    if descuento:
        _poner_descuento(rondas, descuento)

    total = round(sum(r.total for r in rondas), 2)
    if total <= 0:
        raise ReglaNegocio('El total de la cuenta debe ser mayor a 0', 400)
    suma = round(sum(p['monto'] for p in pagos_data), 2)
    if abs(suma - total) > TOLERANCIA:
        raise ReglaNegocio(f'Los pagos suman Bs {suma:.2f} y el total es Bs {total:.2f}', 400)

    por_pagar = [[r, round(r.total, 2)] for r in rondas]
    vuelto = 0.0
    filas = []
    for dato in pagos_data:
        metodo = MetodoPago.query.get(dato['metodo_id'])
        if not metodo:
            raise ReglaNegocio('Método de pago no encontrado', 404)
        es_efectivo = metodo.nombre.lower() == 'efectivo'
        recibido = dato.get('monto_recibido')
        if es_efectivo:
            if recibido is None:
                raise ReglaNegocio('monto_recibido es requerido para efectivo', 400)
            if recibido + TOLERANCIA < dato['monto']:
                raise ReglaNegocio('El monto recibido no puede ser menor al monto a pagar', 400)
            vuelto += max(0.0, recibido - dato['monto'])

        resto = round(dato['monto'], 2)
        de_este_pago = []
        for par in por_pagar:
            if resto < 0.005:
                break
            parte = round(min(resto, par[1]), 2)
            if parte < 0.005:
                continue
            de_este_pago.append(Pago(
                pedido_id=par[0].id, metodo_id=metodo.id, monto=parte,
                usuario_id=pedidos.usuario_actual().id,
                monto_recibido=parte if es_efectivo else None))
            par[1] = round(par[1] - parte, 2)
            resto = round(resto - parte, 2)
        if resto >= 0.005 and de_este_pago:       # sobra por la tolerancia: va a la última fila
            de_este_pago[-1].monto = round(de_este_pago[-1].monto + resto, 2)
            if es_efectivo:
                de_este_pago[-1].monto_recibido = de_este_pago[-1].monto
        if es_efectivo and de_este_pago:
            # El vuelto se guarda una sola vez, en la última fila de este pago.
            de_este_pago[-1].monto_recibido = round(
                de_este_pago[-1].monto + max(0.0, recibido - dato['monto']), 2)
        filas.extend(de_este_pago)

    db.session.add_all(filas)
    cuenta.estado = 'cobrada'
    cuenta.pidio_cuenta = False
    cuenta.cerrada_en = datetime.utcnow()
    cuenta.cerrada_por_id = pedidos.usuario_actual().id
    db.session.commit()
    return round(vuelto, 2)


def anular_cuenta(cuenta):
    """Cierra una cuenta sin cobro: se abrió por error o la mesa no consumió."""
    pedidos.exigir_rol(*ROLES_DE_SALA)
    exigir_cuenta_abierta(cuenta)
    if rondas_enviadas(cuenta):
        raise ReglaNegocio(
            'La mesa tiene pedidos enviados a cocina: cancélalos (con su motivo) o cóbralos', 409)
    for p in list(cuenta.pedidos):
        if pedidos.estado_de(p) == 'pendiente':
            db.session.delete(p)
    cuenta.estado = 'anulada'
    cuenta.cerrada_en = datetime.utcnow()
    cuenta.cerrada_por_id = pedidos.usuario_actual().id
    db.session.commit()
    return cuenta


def cuentas_abiertas_del_turno(turno_id):
    return CuentaMesa.query.filter_by(turno_id=turno_id, estado='abierta').count()


# ---------------------------------------------------------------------------
# Presentación
# ---------------------------------------------------------------------------
def resumen_de_cuenta(cuenta):
    """Datos ligeros de la cuenta para el plano de mesas."""
    estados = [pedidos.estado_de(r) for r in rondas_enviadas(cuenta)]
    return {
        'id': cuenta.id,
        'estado': cuenta.estado,
        'abierta_en': cuenta.abierta_en.isoformat(),
        'abierta_por': cuenta.abierta_por.nombre if cuenta.abierta_por else None,
        'cajero': cuenta.turno.usuario.nombre if cuenta.turno and cuenta.turno.usuario else None,
        'turno_id': cuenta.turno_id,
        'pidio_cuenta': cuenta.pidio_cuenta,
        'rondas': len(estados),
        'rondas_en_cocina': sum(1 for e in estados if e in ('confirmado', 'en_preparacion')),
        'rondas_listas': sum(1 for e in estados if e == 'listo'),
        'total': total_de_cuenta(cuenta),
    }
