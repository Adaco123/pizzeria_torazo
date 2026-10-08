"""Reglas de negocio del pedido: cobro, estados, cancelacion y stock.

Los resources solo validan la entrada y llaman a estas funciones. Ninguna hace commit
salvo `cobrar_pedido` y `cancelar_pedido` / `cambiar_estado_pedido`, que cierran su
propia transaccion; si algo falla se lanza `ReglaNegocio` y el decorador
`manejar_reglas` hace rollback y responde con el estado HTTP que corresponda.
"""
from functools import wraps

from flask_jwt_extended import get_current_user

from app.db import db
from app.factura.models import Factura
from app.pagos.models import MetodoPago, Pago
from app.pedidos.models import EstadoPedido, Pedido, PedidoHistorialEstado
from app.productos.models import Producto
from app.turnos.models import Turno
from app.users.models import ROL_ADMINISTRADOR, ROL_CAJERO, ROL_PIZZERO

TOLERANCIA = 0.005

ESTADOS_PEDIDO = ["pendiente", "confirmado", "en_preparacion",
                  "listo", "entregado", "cancelado"]

# (estado actual, estado nuevo) -> roles que pueden hacer el cambio.
# pendiente -> confirmado NO esta aqui: solo ocurre al cobrar. Cancelar tiene su propia regla.
TRANSICIONES = {
    ("confirmado", "en_preparacion"): {ROL_PIZZERO, ROL_CAJERO, ROL_ADMINISTRADOR},
    ("en_preparacion", "listo"):      {ROL_PIZZERO, ROL_CAJERO, ROL_ADMINISTRADOR},
    ("listo", "entregado"):           {ROL_CAJERO, ROL_ADMINISTRADOR},
}

ESTADOS_CANCELABLES = {"pendiente", "confirmado", "en_preparacion", "listo"}


class ReglaNegocio(Exception):
    """Una regla del negocio impide la operacion. `status` es el codigo HTTP a responder."""

    def __init__(self, mensaje, status=409):
        super().__init__(mensaje)
        self.mensaje = mensaje
        self.status = status


def manejar_reglas(funcion):
    """Convierte ReglaNegocio en una respuesta JSON y deshace la transaccion."""
    @wraps(funcion)
    def envoltura(*args, **kwargs):
        try:
            return funcion(*args, **kwargs)
        except ReglaNegocio as error:
            db.session.rollback()
            return {'success': False, 'error': error.mensaje}, error.status
    return envoltura


def primer_mensaje(errores):
    """Baja por la estructura de errores de marshmallow hasta el primer texto."""
    if isinstance(errores, dict):
        errores = list(errores.values())
    if isinstance(errores, list):
        return primer_mensaje(errores[0]) if errores else ''
    return str(errores)


# ---------------------------------------------------------------------------
# Usuario y permisos
# ---------------------------------------------------------------------------
def usuario_actual():
    usuario = get_current_user()
    if usuario is None:
        raise ReglaNegocio('Usuario no encontrado', 401)
    return usuario


def rol_actual():
    usuario = usuario_actual()
    return usuario.rol.nombre if usuario.rol else None


def es_admin():
    return rol_actual() == ROL_ADMINISTRADOR


def exigir_rol(*roles):
    if rol_actual() not in roles:
        raise ReglaNegocio('No tienes permiso para esta acción', 403)


def exigir_acceso_pedido(pedido):
    """El admin ve todo; el cajero solo sus pedidos; el pizzero solo lo que ya esta en cocina."""
    rol = rol_actual()
    if rol == ROL_ADMINISTRADOR:
        return
    if rol == ROL_CAJERO and pedido.usuario_id == usuario_actual().id:
        return
    if rol == ROL_PIZZERO and estado_de(pedido) != 'pendiente':
        return
    raise ReglaNegocio('No tienes acceso a este pedido', 403)


# ---------------------------------------------------------------------------
# Estado, turno y total
# ---------------------------------------------------------------------------
def estado_de(pedido):
    return pedido.estado.nombre if pedido.estado else None


def asegurar_estados_por_defecto():
    hay_nuevos = False
    for nombre in ESTADOS_PEDIDO:
        if not EstadoPedido.query.filter_by(nombre=nombre).first():
            db.session.add(EstadoPedido(nombre=nombre))
            hay_nuevos = True
    if hay_nuevos:
        db.session.commit()


def exigir_borrador(pedido):
    """Solo se arma el pedido mientras es borrador (pendiente): al cobrarlo queda fijo."""
    if estado_de(pedido) != 'pendiente':
        raise ReglaNegocio('El pedido ya fue cobrado y no se puede modificar', 409)


def exigir_turno_abierto(turno):
    if turno is None or turno.cierre is not None:
        raise ReglaNegocio('El turno de este pedido está cerrado', 409)


def recalcular_total(pedido):
    total = 0
    for detalle in pedido.detalles:
        if detalle.is_mitad:
            detalle.calcular_subtotal_mitad()
        else:
            detalle.calcular_subtotal()
        total += detalle.subtotal
    pedido.total = total
    db.session.flush()
    return total


def cambiar_estado(pedido, nombre_estado):
    """Cambia el estado y deja rastro en el historial. No hace commit."""
    estado = EstadoPedido.query.filter_by(nombre=nombre_estado).first()
    if not estado:
        raise ReglaNegocio(f'Estado "{nombre_estado}" no existe en BD', 404)
    pedido.estado_id = estado.id
    db.session.add(PedidoHistorialEstado(
        pedido_id=pedido.id, estado_id=estado.id, usuario_id=usuario_actual().id))
    db.session.flush()


def asignar_ficha(pedido):
    """Numero de ficha: siguiente del turno. Se bloquea la fila del turno para que dos
    cobros simultaneos no tomen el mismo numero."""
    Turno.query.filter_by(id=pedido.turno_id).with_for_update().first()
    ultimo = (
        db.session.query(db.func.max(Pedido.numero_turno))
        .filter(Pedido.turno_id == pedido.turno_id)
        .scalar()
    )
    pedido.numero_turno = (ultimo or 0) + 1


def factura_activa(pedido):
    return Factura.query.filter_by(pedido_id=pedido.id, anulada=False).first()


# ---------------------------------------------------------------------------
# Stock de bebidas
# ---------------------------------------------------------------------------
def _es_bebida(producto):
    return bool(producto and producto.categoria and producto.categoria.nombre.lower() == 'bebidas')


def cantidades_de_bebidas(pedido):
    """producto_id -> unidades de bebida del pedido."""
    cantidades = {}
    for detalle in pedido.detalles:
        if detalle.producto_id and _es_bebida(detalle.producto):
            cantidades[detalle.producto_id] = cantidades.get(detalle.producto_id, 0) + detalle.cantidad
    return cantidades


def descontar_stock(pedido):
    """Descuenta las bebidas del pedido. Falla sin tocar nada si alguna no alcanza."""
    for producto_id, cantidad in cantidades_de_bebidas(pedido).items():
        producto = Producto.query.filter_by(id=producto_id).with_for_update().first()
        disponible = producto.stock or 0
        if disponible < cantidad:
            raise ReglaNegocio(
                f'Stock insuficiente para "{producto.nombre}". '
                f'Disponible: {disponible}, solicitado: {cantidad}', 409)
        producto.stock = disponible - cantidad


def devolver_stock(pedido):
    for producto_id, cantidad in cantidades_de_bebidas(pedido).items():
        producto = Producto.query.filter_by(id=producto_id).with_for_update().first()
        producto.stock = (producto.stock or 0) + cantidad


# ---------------------------------------------------------------------------
# Cobro
# ---------------------------------------------------------------------------
def cobrar_pedido(pedido, pagos_data):
    """Cobra el pedido completo y lo manda a cocina, todo en una transaccion.

    `pagos_data`: lista de {metodo_id, monto, monto_recibido}; la suma de montos tiene
    que ser igual al total (se permite dividir entre efectivo y QR).
    Devuelve el vuelto total a entregar.
    """
    exigir_rol(ROL_CAJERO, ROL_ADMINISTRADOR)
    exigir_acceso_pedido(pedido)
    if estado_de(pedido) != 'pendiente':
        raise ReglaNegocio('El pedido ya fue cobrado o cerrado', 409)
    exigir_turno_abierto(pedido.turno)
    if not pedido.detalles:
        raise ReglaNegocio('Agrega productos al pedido antes de cobrar', 400)

    total = round(recalcular_total(pedido), 2)
    if total <= 0:
        raise ReglaNegocio('El total del pedido debe ser mayor a 0', 400)

    suma = round(sum(pago['monto'] for pago in pagos_data), 2)
    if abs(suma - total) > TOLERANCIA:
        raise ReglaNegocio(f'Los pagos suman Bs {suma:.2f} y el total es Bs {total:.2f}', 400)

    pagos = []
    vuelto = 0.0
    for dato in pagos_data:
        metodo = MetodoPago.query.get(dato['metodo_id'])
        if not metodo:
            raise ReglaNegocio('Método de pago no encontrado', 404)

        recibido = dato.get('monto_recibido')
        if metodo.nombre.lower() == 'efectivo':
            if recibido is None:
                raise ReglaNegocio('monto_recibido es requerido para efectivo', 400)
            if recibido + TOLERANCIA < dato['monto']:
                raise ReglaNegocio('El monto recibido no puede ser menor al monto a pagar', 400)
            vuelto += max(0.0, recibido - dato['monto'])
        else:
            recibido = None

        pagos.append(Pago(
            pedido_id=pedido.id,
            metodo_id=metodo.id,
            monto=dato['monto'],
            usuario_id=usuario_actual().id,
            monto_recibido=recibido,
        ))

    descontar_stock(pedido)
    asignar_ficha(pedido)
    db.session.add_all(pagos)
    cambiar_estado(pedido, 'confirmado')
    db.session.commit()
    return round(vuelto, 2)


# ---------------------------------------------------------------------------
# Cancelacion y cambios de estado
# ---------------------------------------------------------------------------
def cancelar_pedido(pedido, motivo=None):
    """Cancela el pedido. Si ya estaba cobrado se registra la devolucion (pagos en
    negativo, por el mismo metodo) y vuelve el stock de las bebidas."""
    exigir_rol(ROL_CAJERO, ROL_ADMINISTRADOR)
    exigir_acceso_pedido(pedido)

    actual = estado_de(pedido)
    if actual not in ESTADOS_CANCELABLES:
        raise ReglaNegocio(f'Un pedido {actual.replace("_", " ")} ya no se puede cancelar', 409)
    # La comida ya está hecha: cancelarla y devolver el dinero lo decide el administrador.
    if actual == 'listo' and not es_admin():
        raise ReglaNegocio('Un pedido listo solo lo puede cancelar el administrador', 403)
    if factura_activa(pedido):
        raise ReglaNegocio('Anula la factura antes de cancelar el pedido', 409)

    motivo = (motivo or '').strip()
    cobrado = actual != 'pendiente'
    if cobrado:
        if len(motivo) < 3:
            raise ReglaNegocio('Escribe el motivo de la cancelación', 400)
        # Devolver dinero solo se puede dentro del turno abierto; fuera de el, el admin.
        if not es_admin():
            exigir_turno_abierto(pedido.turno)

        neto_por_metodo = {}
        for pago in pedido.pagos:
            neto_por_metodo[pago.metodo_id] = neto_por_metodo.get(pago.metodo_id, 0) + pago.monto
        for metodo_id, neto in neto_por_metodo.items():
            if neto > TOLERANCIA:
                db.session.add(Pago(
                    pedido_id=pedido.id,
                    metodo_id=metodo_id,
                    monto=-round(neto, 2),
                    usuario_id=usuario_actual().id,
                ))
        devolver_stock(pedido)

    pedido.motivo_cancelacion = motivo or None
    cambiar_estado(pedido, 'cancelado')
    db.session.commit()


def cambiar_estado_pedido(pedido, nuevo, motivo=None):
    """Cambio de estado pedido por el cliente (PATCH /estado), validando la maquina de estados."""
    if nuevo not in ESTADOS_PEDIDO:
        raise ReglaNegocio(f'Estado inválido. Debe ser uno de: {", ".join(ESTADOS_PEDIDO)}', 400)

    exigir_acceso_pedido(pedido)

    if nuevo == 'cancelado':
        return cancelar_pedido(pedido, motivo)

    actual = estado_de(pedido)
    if actual == 'pendiente' and nuevo == 'confirmado':
        raise ReglaNegocio('El pedido pasa a cocina al cobrarlo: usa el cobro', 409)

    roles = TRANSICIONES.get((actual, nuevo))
    if roles is None:
        raise ReglaNegocio(
            f'No se puede pasar un pedido de {actual.replace("_", " ")} '
            f'a {nuevo.replace("_", " ")}', 409)
    exigir_rol(*roles)

    cambiar_estado(pedido, nuevo)
    db.session.commit()


# ---------------------------------------------------------------------------
# Ventas del turno (resumen de caja)
# ---------------------------------------------------------------------------
def pedidos_vendidos(turno_id):
    """Pedidos del turno que cuentan como venta: cobrados y no cancelados.

    Un borrador (pendiente sin pagos) no es venta. Los pedidos antiguos que ya
    estaban confirmados/entregados sin pagos registrados se siguen contando.
    """
    pedidos = Pedido.query.filter_by(turno_id=turno_id).all()
    vendidos = []
    for pedido in pedidos:
        estado = estado_de(pedido)
        if estado == 'cancelado':
            continue
        if estado == 'pendiente' and not pedido.pagos:
            continue
        vendidos.append(pedido)
    return vendidos


def totales_de_ventas(pedidos):
    """Totales de caja: lo cobrado de verdad (pagos) y las facturas emitidas."""
    ids = [p.id for p in pedidos]
    facturas = (
        Factura.query.filter(Factura.pedido_id.in_(ids), Factura.anulada == False).all()  # noqa: E712
        if ids else []
    )
    pagos = [pago for pedido in pedidos for pago in pedido.pagos]

    pagos_por_metodo = {}
    for pago in pagos:
        nombre = pago.metodo.nombre if pago.metodo else 'Sin especificar'
        entrada = pagos_por_metodo.setdefault(nombre, {'cantidad': 0, 'total': 0.0})
        entrada['cantidad'] += 1
        entrada['total'] += pago.monto

    return {
        'total_vendido':  sum(p.monto for p in pagos),
        'total_subtotal': sum(p.total for p in pedidos),
        'total_impuesto': sum(f.impuesto for f in facturas),
        'total_facturas': len(facturas),
        'pagos_por_metodo': pagos_por_metodo,
    }
