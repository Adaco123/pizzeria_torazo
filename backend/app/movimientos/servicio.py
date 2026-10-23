"""Entradas y ajustes del stock de bebidas. Todo movimiento queda en el historial."""
from datetime import datetime, timedelta

from app.db import db
from app.movimientos.models import MovimientoStock
from app.pedidos.servicio import ReglaNegocio, es_bebida, exigir_rol, usuario_actual
from app.productos.models import Producto
from app.turnos.models import Turno
from app.users.models import ROL_ADMINISTRADOR, ROL_CAJERO


def _exigir_bebida(producto):
    if not es_bebida(producto):
        raise ReglaNegocio(f'"{producto.nombre}" no es una bebida: solo las bebidas llevan stock', 400)


def _mover(producto, cantidad, motivo=None):
    """Suma `cantidad` (con signo) al stock y deja el movimiento. Hace commit."""
    usuario = usuario_actual()
    # Se bloquea la fila: dos entradas a la vez no se pisan.
    producto = Producto.query.filter_by(id=producto.id).with_for_update().first()
    anterior = producto.stock or 0
    nuevo = anterior + cantidad
    if nuevo < 0:
        raise ReglaNegocio(f'El stock no puede quedar negativo: hay {anterior} y se restan {-cantidad}', 409)

    turno = (Turno.query.filter_by(usuario_id=usuario.id, cierre=None)
             .order_by(Turno.apertura.desc()).first())
    producto.stock = nuevo
    movimiento = MovimientoStock(
        producto_id=producto.id, usuario_id=usuario.id, turno_id=turno.id if turno else None,
        cantidad=cantidad, stock_anterior=anterior, stock_nuevo=nuevo, motivo=motivo,
        tipo='ajuste' if motivo else 'entrada')
    db.session.add(movimiento)
    db.session.commit()
    return movimiento


def registrar_entrada(producto, cantidad):
    """Llegó mercadería: cajero o administrador."""
    exigir_rol(ROL_CAJERO, ROL_ADMINISTRADOR)
    _exigir_bebida(producto)
    if cantidad <= 0:
        raise ReglaNegocio('La cantidad debe ser mayor a 0', 400)
    return _mover(producto, cantidad)


def ajustar_stock(producto, cantidad, motivo):
    """Corrección hacia arriba o abajo, con motivo: solo el administrador."""
    exigir_rol(ROL_ADMINISTRADOR)
    _exigir_bebida(producto)
    if cantidad == 0:
        raise ReglaNegocio('La cantidad no puede ser 0', 400)
    return _mover(producto, cantidad, motivo.strip())


DESFASE_BOLIVIA = timedelta(hours=4)


def resumen_del_dia(producto_ids):
    """producto_id -> {'entradas': llegaron hoy, 'vendidas': vendidas hoy (neto de devoluciones)}.
    "Hoy" empieza a las 00:00 de Bolivia."""
    ahora_bolivia = datetime.utcnow() - DESFASE_BOLIVIA
    inicio = datetime.combine(ahora_bolivia.date(), datetime.min.time()) + DESFASE_BOLIVIA
    movimientos = (MovimientoStock.query
                   .filter(MovimientoStock.producto_id.in_(producto_ids), MovimientoStock.fecha >= inicio)
                   .all()) if producto_ids else []
    resumen = {}
    for m in movimientos:
        fila = resumen.setdefault(m.producto_id, {'entradas': 0, 'vendidas': 0})
        if m.tipo == 'entrada':
            fila['entradas'] += m.cantidad
        elif m.tipo in ('venta', 'devolucion'):
            fila['vendidas'] -= m.cantidad   # la venta es negativa; la devolución, positiva
    return resumen
