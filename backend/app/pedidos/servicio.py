"""Reglas de negocio del pedido: cobro, estados, cancelacion y stock.

Los resources solo validan la entrada y llaman a estas funciones. Ninguna hace commit
salvo `cobrar_pedido` y `cancelar_pedido` / `cambiar_estado_pedido`, que cierran su
propia transaccion; si algo falla se lanza `ReglaNegocio` y el decorador
`manejar_reglas` hace rollback y responde con el estado HTTP que corresponda.
"""
from datetime import datetime, timedelta
from functools import wraps

from flask_jwt_extended import get_current_user

from app.db import db
from app.factura.models import Factura
from app.movimientos.models import MovimientoStock
from app.pagos.models import MetodoPago, Pago
from app.pedidos.models import EstadoPedido, Pedido, PedidoHistorialEstado
from app.productos.models import Producto
from app.turnos.models import Turno
from app.users.models import ROL_ADMINISTRADOR, ROL_CAJERO, ROL_MESERO, ROL_PIZZERO

TOLERANCIA = 0.005

ESTADOS_PEDIDO = ["pendiente", "confirmado", "en_preparacion",
                  "listo", "entregado", "cancelado"]

# (estado actual, estado nuevo) -> roles que pueden hacer el cambio.
# pendiente -> confirmado NO esta aqui: solo ocurre al cobrar. Cancelar tiene su propia regla.
TRANSICIONES = {
    ("confirmado", "en_preparacion"): {ROL_PIZZERO, ROL_CAJERO, ROL_ADMINISTRADOR},
    ("en_preparacion", "listo"):      {ROL_PIZZERO, ROL_CAJERO, ROL_ADMINISTRADOR},
    ("listo", "entregado"):           {ROL_CAJERO, ROL_MESERO, ROL_ADMINISTRADOR},
}

ESTADOS_CANCELABLES = {"pendiente", "confirmado", "en_preparacion", "listo"}

# Minutos de espera que se prometen al cobrar, segun el tipo de entrega (el cajero puede cambiarlos).
MINUTOS_ESPERA = {"local": 20, "domicilio": 40}
MINUTOS_ESPERA_DEFECTO = 25
# Solo se puede cambiar la hora prometida mientras el pedido sigue en cocina o esperando entrega.
ESTADOS_CON_HORA_EDITABLE = {"confirmado", "en_preparacion", "listo"}


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
    """El admin ve todo; el cajero solo sus pedidos (y las rondas de las mesas de su turno); el
    mesero solo las rondas de mesas; el pizzero solo lo que ya esta en cocina."""
    rol = rol_actual()
    if rol == ROL_ADMINISTRADOR:
        return
    if rol == ROL_CAJERO and pedido.usuario_id == usuario_actual().id:
        return
    if rol == ROL_CAJERO and pedido.cuenta_id and pedido.cuenta.turno.usuario_id == usuario_actual().id:
        return
    if rol == ROL_MESERO and pedido.cuenta_id:
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
    # Las líneas nuevas se crean con `pedido_id`, no a través de `pedido.detalles`. Si esa lista
    # ya se leyó antes en la misma petición (por ejemplo al validar el stock de una bebida),
    # en memoria quedaría sin la línea nueva y el total saldría mal. Se vuelve a leer de la BD.
    db.session.flush()
    db.session.expire(pedido, ['detalles'])
    total = 0
    for detalle in pedido.detalles:
        if detalle.is_mitad:
            detalle.calcular_subtotal_mitad()
        else:
            detalle.calcular_subtotal()
        total += detalle.subtotal
    pedido.descuento = monto_del_descuento(pedido, total)
    total -= pedido.descuento              # el descuento es solo sobre los productos
    total += pedido.envio_cobrado          # el envío es parte de lo que paga el cliente
    pedido.total = total
    db.session.flush()
    return total


MAX_COSTO_ENVIO = 1000
TOPE_DESCUENTO_CAJERO = 10      # % de los productos: más que eso solo lo da el administrador
TIPOS_DESCUENTO = ('porcentaje', 'monto')


def monto_del_descuento(pedido, productos):
    """Bs que se descuentan hoy, según lo pedido (nunca más que el valor de los productos)."""
    if not pedido.descuento_tipo or not pedido.descuento_valor:
        return 0.0
    if pedido.descuento_tipo == 'porcentaje':
        monto = productos * pedido.descuento_valor / 100
    else:
        monto = pedido.descuento_valor
    return round(min(max(monto, 0.0), productos), 2)


def aplicar_descuento(pedido, tipo, valor, motivo):
    """Pone (o cambia) el descuento de un borrador. El cajero tiene tope; el admin no."""
    exigir_rol(ROL_CAJERO, ROL_ADMINISTRADOR)
    exigir_acceso_pedido(pedido)
    exigir_borrador(pedido)
    if tipo not in TIPOS_DESCUENTO:
        raise ReglaNegocio('El descuento es un porcentaje o un monto en Bs', 400)
    if isinstance(valor, bool) or not isinstance(valor, (int, float)) or valor != valor or valor <= 0:
        raise ReglaNegocio('El descuento debe ser un número mayor a 0', 400)
    motivo = (motivo or '').strip()
    if not motivo:
        raise ReglaNegocio('Escribe el motivo del descuento', 400)
    if len(motivo) > 200:
        raise ReglaNegocio('El motivo es demasiado largo (máximo 200 letras)', 400)

    recalcular_total(pedido)
    productos = round(sum(d.subtotal for d in pedido.detalles), 2)
    if productos <= 0:
        raise ReglaNegocio('Agrega productos al pedido antes de dar un descuento', 400)
    if tipo == 'porcentaje' and valor > 100:
        raise ReglaNegocio('El porcentaje no puede pasar de 100', 400)
    if tipo == 'monto' and valor > productos + TOLERANCIA:
        raise ReglaNegocio(f'El descuento no puede ser mayor a los productos (Bs {productos:.2f})', 400)

    pedido.descuento_tipo = tipo
    pedido.descuento_valor = float(valor)
    pedido.descuento_motivo = motivo
    pedido.descuento_usuario_id = usuario_actual().id
    recalcular_total(pedido)
    if not es_admin() and pedido.descuento > productos * TOPE_DESCUENTO_CAJERO / 100 + TOLERANCIA:
        raise ReglaNegocio(
            f'Un cajero da hasta {TOPE_DESCUENTO_CAJERO}% de descuento. '
            'Para más, pide al administrador', 403)


def quitar_descuento(pedido):
    exigir_rol(ROL_CAJERO, ROL_ADMINISTRADOR)
    exigir_acceso_pedido(pedido)
    exigir_borrador(pedido)
    pedido.descuento_tipo = None
    pedido.descuento_valor = 0
    pedido.descuento_motivo = None
    pedido.descuento_usuario_id = None
    recalcular_total(pedido)


def exigir_descuento_permitido(pedido):
    """Antes de cobrar: un descuento de cajero que quedó sobre el tope (por ejemplo, porque
    quitó productos después de ponerlo) necesita al administrador."""
    if not pedido.descuento:
        return
    quien = pedido.descuento_usuario
    if quien is not None and quien.rol is not None and quien.rol.nombre == ROL_ADMINISTRADOR:
        return
    productos = sum(d.subtotal for d in pedido.detalles)
    if pedido.descuento > productos * TOPE_DESCUENTO_CAJERO / 100 + TOLERANCIA:
        raise ReglaNegocio(
            f'El descuento supera el tope del cajero ({TOPE_DESCUENTO_CAJERO}% de los productos). '
            'Bájalo o pide al administrador que lo aplique', 409)


def aplicar_envio(pedido, data):
    """Costo de envío y repartidor de un borrador, a partir de `costo_envio` / `repartidor_id`.

    Solo los pedidos a domicilio llevan envío: si pasan a Local se borran los dos datos.
    Debe llamarse después de fijar el tipo de entrega. No hace commit.
    """
    from app.repartidores.models import Repartidor

    if 'costo_envio' in data:
        crudo = data['costo_envio']
        try:
            costo = 0.0 if crudo in (None, '') else float(crudo)
        except (TypeError, ValueError):
            raise ReglaNegocio('El costo de envío no es un número válido', 400)
        if isinstance(crudo, bool) or costo != costo or costo < 0 or costo > MAX_COSTO_ENVIO:
            raise ReglaNegocio(f'El costo de envío debe estar entre 0 y {MAX_COSTO_ENVIO}', 400)
        pedido.costo_envio = round(costo, 2)

    if 'repartidor_id' in data:
        if data['repartidor_id'] in (None, ''):
            pedido.repartidor_id = None
        else:
            repartidor = Repartidor.query.get(data['repartidor_id'])
            if not repartidor:
                raise ReglaNegocio('Repartidor no existe', 404)
            if not repartidor.activo:
                raise ReglaNegocio(f'"{repartidor.nombre}" está desactivado', 400)
            pedido.repartidor_id = repartidor.id

    db.session.flush()
    db.session.refresh(pedido)
    if not pedido.es_domicilio:
        if (data.get('costo_envio') not in (None, '', 0, 0.0, '0')) or data.get('repartidor_id'):
            raise ReglaNegocio('El costo de envío y el repartidor solo aplican a pedidos a domicilio', 400)
        pedido.costo_envio = 0
        pedido.repartidor_id = None
    recalcular_total(pedido)


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
def es_bebida(producto):
    """Las bebidas se venden por unidad con stock: no tienen tamaños, ingredientes ni extras."""
    return bool(producto and producto.categoria and producto.categoria.nombre.strip().lower() == 'bebidas')


_es_bebida = es_bebida


def es_pizza(producto):
    """Solo los productos de la categoría Pizzas se pueden pedir mitad y mitad.
    Se reconoce por el nombre de la categoría (como Bebidas), no por su id."""
    if not producto or not producto.categoria:
        return False
    return producto.categoria.nombre.strip().lower() in ('pizza', 'pizzas')


def productos_de_combo(combo, cantidad=1):
    """(producto, unidades) que lleva un combo pedido `cantidad` veces."""
    return [(cp.producto, cp.cantidad * cantidad) for cp in combo.combo_productos if cp.producto]


def cantidades_de_bebidas(pedido):
    """producto_id -> unidades de bebida del pedido (las que vienen dentro de un combo también)."""
    cantidades = {}
    for detalle in pedido.detalles:
        if detalle.producto_id and _es_bebida(detalle.producto):
            cantidades[detalle.producto_id] = cantidades.get(detalle.producto_id, 0) + detalle.cantidad
        elif detalle.combo is not None:
            for producto, unidades in productos_de_combo(detalle.combo, detalle.cantidad):
                if _es_bebida(producto):
                    cantidades[producto.id] = cantidades.get(producto.id, 0) + unidades
    return cantidades


def exigir_combo_disponible(combo, cantidad, pedido):
    """Un combo no se vende si alguno de sus productos está agotado o no alcanza el stock
    de sus bebidas (contando lo que el pedido ya lleva)."""
    for producto, _ in productos_de_combo(combo):
        if producto.agotado:
            raise ReglaNegocio(f'El combo "{combo.nombre}" no se puede vender: "{producto.nombre}" está agotado', 409)
    ya_en_pedido = cantidades_de_bebidas(pedido)
    for producto, unidades in productos_de_combo(combo, cantidad):
        if _es_bebida(producto):
            disponible = producto.stock or 0
            if disponible < ya_en_pedido.get(producto.id, 0) + unidades:
                raise ReglaNegocio(
                    f'El combo "{combo.nombre}" lleva "{producto.nombre}" y no alcanza el stock '
                    f'(hay {disponible}, en el pedido {ya_en_pedido.get(producto.id, 0)}, el combo pide {unidades})', 400)


def _anotar_movimiento(pedido, producto, cantidad, anterior, tipo, motivo):
    """Deja en el historial de stock lo que vendió o devolvió un pedido (no hace commit)."""
    db.session.add(MovimientoStock(
        producto_id=producto.id, usuario_id=usuario_actual().id, turno_id=pedido.turno_id,
        cantidad=cantidad, stock_anterior=anterior, stock_nuevo=anterior + cantidad,
        motivo=motivo, tipo=tipo))


def descontar_stock(pedido):
    """Descuenta las bebidas del pedido y lo anota en el historial. Falla sin tocar nada
    si alguna no alcanza. Conviene llamarla con la ficha ya asignada."""
    for producto_id, cantidad in cantidades_de_bebidas(pedido).items():
        producto = Producto.query.filter_by(id=producto_id).with_for_update().first()
        disponible = producto.stock or 0
        if disponible < cantidad:
            raise ReglaNegocio(
                f'Stock insuficiente para "{producto.nombre}". '
                f'Disponible: {disponible}, solicitado: {cantidad}', 409)
        producto.stock = disponible - cantidad
        _anotar_movimiento(pedido, producto, -cantidad, disponible, 'venta', f'Venta ficha {pedido.numero_turno}')


def devolver_stock(pedido):
    for producto_id, cantidad in cantidades_de_bebidas(pedido).items():
        producto = Producto.query.filter_by(id=producto_id).with_for_update().first()
        anterior = producto.stock or 0
        producto.stock = anterior + cantidad
        _anotar_movimiento(pedido, producto, cantidad, anterior, 'devolucion',
                           f'Pedido cancelado, ficha {pedido.numero_turno}')


# ---------------------------------------------------------------------------
# Cobro
# ---------------------------------------------------------------------------
def minutos_espera_por_defecto(pedido):
    nombre = (pedido.tipo_entrega.nombre if pedido.tipo_entrega else '').lower()
    return MINUTOS_ESPERA.get(nombre, MINUTOS_ESPERA_DEFECTO)


def exigir_disponible(producto):
    """No se vende un producto que cocina marco como agotado."""
    if producto is not None and producto.agotado:
        raise ReglaNegocio(f'"{producto.nombre}" está agotado', 409)


def exigir_productos_disponibles(pedido):
    """Revisa el pedido completo antes de cobrar: algo pudo agotarse despues de agregarlo."""
    agotados = []
    for detalle in pedido.detalles:
        productos = [detalle.producto] + [m.producto for m in detalle.mitades]
        if detalle.combo is not None:
            productos += [producto for producto, _ in productos_de_combo(detalle.combo)]
        for producto in productos:
            if producto is not None and producto.agotado and producto.nombre not in agotados:
                agotados.append(producto.nombre)
    if agotados:
        nombres = ', '.join(f'"{n}"' for n in agotados)
        raise ReglaNegocio(f'Se agotó: {nombres}. Quítalo del pedido antes de cobrar', 409)


def marcar_agotado(producto, agotado):
    """Cocina, caja y administrador pueden marcar o desmarcar un producto agotado."""
    exigir_rol(ROL_PIZZERO, ROL_CAJERO, ROL_ADMINISTRADOR)
    producto.agotado = bool(agotado)
    db.session.commit()
    return producto


def ajustar_hora_prometida(pedido, minutos):
    """Cambia la hora prometida: `minutos` contados desde ahora."""
    exigir_rol(ROL_CAJERO, ROL_ADMINISTRADOR)
    exigir_acceso_pedido(pedido)
    actual = estado_de(pedido)
    if actual not in ESTADOS_CON_HORA_EDITABLE:
        raise ReglaNegocio(
            f'No se puede cambiar la hora de un pedido {actual.replace("_", " ")}', 409)
    pedido.hora_prometida = datetime.utcnow() + timedelta(minutes=minutos)
    db.session.commit()
    return pedido


def cobrar_pedido(pedido, pagos_data, minutos_espera=None):
    """Cobra el pedido completo y lo manda a cocina, todo en una transaccion.

    `pagos_data`: lista de {metodo_id, monto, monto_recibido}; la suma de montos tiene
    que ser igual al total (se permite dividir entre efectivo y QR).
    Devuelve el vuelto total a entregar.
    """
    exigir_rol(ROL_CAJERO, ROL_ADMINISTRADOR)
    exigir_acceso_pedido(pedido)
    if pedido.cuenta_id:
        raise ReglaNegocio('Este pedido es de una mesa: se cobra junto con la cuenta de la mesa', 409)
    if estado_de(pedido) != 'pendiente':
        raise ReglaNegocio('El pedido ya fue cobrado o cerrado', 409)
    exigir_turno_abierto(pedido.turno)
    if not pedido.detalles:
        raise ReglaNegocio('Agrega productos al pedido antes de cobrar', 400)

    total = round(recalcular_total(pedido), 2)
    exigir_descuento_permitido(pedido)
    if total <= 0:
        raise ReglaNegocio('El total del pedido debe ser mayor a 0', 400)

    exigir_productos_disponibles(pedido)

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

    asignar_ficha(pedido)
    descontar_stock(pedido)
    pedido.hora_prometida = datetime.utcnow() + timedelta(
        minutes=minutos_espera or minutos_espera_por_defecto(pedido))
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


def envios_y_descuentos(pedidos):
    """Lo cobrado por envío (total y por repartidor) y lo descontado, de pedidos que ya son venta."""
    envios_total, envios_pedidos = 0.0, 0
    descuentos_total, descuentos_pedidos = 0.0, 0
    por_repartidor = {}
    for pedido in pedidos:
        if pedido.envio_cobrado > 0:
            envios_total += pedido.envio_cobrado
            envios_pedidos += 1
        if (pedido.descuento or 0) > 0:
            descuentos_total += pedido.descuento
            descuentos_pedidos += 1
        if pedido.es_domicilio:
            nombre = pedido.repartidor.nombre if pedido.repartidor else 'Sin repartidor'
            fila = por_repartidor.setdefault(nombre, {'repartidor': nombre, 'entregas': 0, 'envios': 0.0})
            fila['entregas'] += 1
            fila['envios'] += pedido.envio_cobrado
    return {
        'envios': {'pedidos': envios_pedidos, 'total': round(envios_total, 2)},
        'descuentos': {'pedidos': descuentos_pedidos, 'total': round(descuentos_total, 2)},
        'por_repartidor': [
            {**fila, 'envios': round(fila['envios'], 2)}
            for fila in sorted(por_repartidor.values(), key=lambda f: -f['entregas'])
        ],
    }


def cuadre_de_caja(turno, pagos_por_metodo):
    """Efectivo que deberia haber en caja al cerrar: monto inicial + efectivo cobrado
    (neto de devoluciones) - lo que salio de la caja en gastos y retiros. El QR y otros
    metodos no pasan por la caja fisica."""
    efectivo = sum(
        info['total'] for nombre, info in pagos_por_metodo.items()
        if nombre.strip().lower() == 'efectivo'
    )
    gastos = round(sum(g.monto for g in turno.gastos if not g.anulado), 2)
    esperado = round(turno.monto_inicio + efectivo - gastos, 2)
    diferencia = None if turno.monto_cierre is None else round(turno.monto_cierre - esperado, 2)
    return {
        'efectivo_cobrado': round(efectivo, 2),
        'gastos_caja': gastos,
        'efectivo_esperado': esperado,
        'diferencia': diferencia,
    }


def exigir_acceso_turno(turno, para_resumen=False):
    """El administrador ve todos los turnos; el cajero solo los suyos.

    El resumen de un turno abierto es solo del administrador: el cajero cierra a ciegas
    (cuenta el efectivo sin saber cuanto "deberia" haber) y recien despues ve el cuadre."""
    rol = rol_actual()
    if rol == ROL_ADMINISTRADOR:
        return
    if rol == ROL_CAJERO and turno.usuario_id == usuario_actual().id:
        if para_resumen and turno.cierre is None:
            raise ReglaNegocio('El resumen de tu turno se ve cuando lo cierres', 403)
        return
    raise ReglaNegocio('No tienes acceso a este turno', 403)
