"""Reportes de ventas para el administrador. Todo en horario de Bolivia (UTC-4).

Una venta es un pedido cobrado y no cancelado. El día de una venta es el día en que se
cobró (el primer pago), no en el que se empezó a armar. Una cancelación es un pedido
cobrado que después se devolvió; cuenta en el día de la devolución.
"""
from datetime import date, datetime, timedelta

from app.pagos.models import Pago
from app.pedidos.models import Pedido
from app.gastos.models import CATEGORIAS_GASTO, GastoCaja
from app.pedidos.servicio import estado_de

DESFASE_BOLIVIA = timedelta(hours=4)
MAX_DIAS = 366
TOP_PRODUCTOS = 20
TOP_CLIENTES = 10
CLIENTE_MOSTRADOR = 1    # cliente anónimo por defecto: no entra al ranking


class RangoInvalido(ValueError):
    pass


def rango_de_fechas(desde, hasta, hoy=None):
    """Convierte 'AAAA-MM-DD' (hora Bolivia) en fechas. Sin datos: los últimos 7 días."""
    hoy = hoy or (datetime.utcnow() - DESFASE_BOLIVIA).date()
    try:
        fin = date.fromisoformat(hasta) if hasta else hoy
        inicio = date.fromisoformat(desde) if desde else fin - timedelta(days=6)
    except ValueError:
        raise RangoInvalido('Las fechas deben tener el formato AAAA-MM-DD')
    if inicio > fin:
        raise RangoInvalido('La fecha "desde" no puede ser posterior a "hasta"')
    if (fin - inicio).days + 1 > MAX_DIAS:
        raise RangoInvalido(f'El rango no puede pasar de {MAX_DIAS} días')
    return inicio, fin


def _dia_bolivia(momento_utc):
    return (momento_utc - DESFASE_BOLIVIA).date()


def _en_rango(momento_utc, inicio, fin):
    return inicio <= _dia_bolivia(momento_utc) <= fin


def _lineas(pedido):
    """(nombre, cantidad, subtotal) de cada producto del pedido. Mitad y mitad cuenta
    media pizza de cada sabor, con la mitad del importe."""
    for detalle in pedido.detalles:
        if detalle.is_mitad and detalle.mitades:
            for mitad in detalle.mitades:
                nombre = mitad.producto.nombre if mitad.producto else 'Producto eliminado'
                yield f'{nombre} (½)', detalle.cantidad / 2, detalle.subtotal / len(detalle.mitades)
        elif detalle.combo is not None:
            yield f'Combo {detalle.combo.nombre}', detalle.cantidad, detalle.subtotal
        else:
            nombre = detalle.producto.nombre if detalle.producto else 'Producto eliminado'
            yield nombre, detalle.cantidad, detalle.subtotal


def reporte_de_ventas(inicio, fin):
    # Margen de un día a cada lado para cubrir el desfase horario; el filtro fino es en Python.
    desde_utc = datetime.combine(inicio, datetime.min.time()) + DESFASE_BOLIVIA
    hasta_utc = datetime.combine(fin + timedelta(days=1), datetime.min.time()) + DESFASE_BOLIVIA

    pagos = (Pago.query
             .filter(Pago.fecha >= desde_utc, Pago.fecha < hasta_utc)
             .order_by(Pago.fecha).all())

    por_dia, por_metodo, por_producto = {}, {}, {}
    por_cliente, por_repartidor = {}, {}
    envios_total, envios_pedidos = 0.0, 0
    descuentos_total, descuentos_pedidos = 0.0, 0
    pedidos_ids = set()
    cancelados = {}
    devuelto = 0.0

    for pago in pagos:
        nombre_metodo = pago.metodo.nombre if pago.metodo else 'Sin especificar'
        entrada = por_metodo.setdefault(nombre_metodo, {'metodo': nombre_metodo, 'cantidad': 0, 'total': 0.0})
        entrada['total'] += pago.monto
        if pago.monto > 0:
            entrada['cantidad'] += 1
        else:
            devuelto += -pago.monto
            cancelados.setdefault(pago.pedido_id, []).append(pago)

    # Ventas: pedidos con un primer cobro dentro del rango y que siguen sin cancelarse.
    for pago in pagos:
        if pago.monto <= 0 or pago.pedido_id in pedidos_ids:
            continue
        pedido = pago.pedido
        primer_cobro = min(p.fecha for p in pedido.pagos if p.monto > 0)
        if primer_cobro != pago.fecha or estado_de(pedido) == 'cancelado':
            continue
        pedidos_ids.add(pedido.id)
        dia = _dia_bolivia(pago.fecha).isoformat()
        d = por_dia.setdefault(dia, {'fecha': dia, 'pedidos': 0, 'total': 0.0})
        d['pedidos'] += 1
        d['total'] += pedido.total
        if pedido.envio_cobrado > 0:
            envios_total += pedido.envio_cobrado
            envios_pedidos += 1
        if (pedido.descuento or 0) > 0:
            descuentos_total += pedido.descuento
            descuentos_pedidos += 1
        if pedido.es_domicilio:
            nombre_rep = pedido.repartidor.nombre if pedido.repartidor else 'Sin repartidor'
            r = por_repartidor.setdefault(nombre_rep, {'repartidor': nombre_rep, 'entregas': 0, 'envios': 0.0})
            r['entregas'] += 1
            r['envios'] += pedido.envio_cobrado
        if pedido.cliente_id != CLIENTE_MOSTRADOR:
            c = por_cliente.setdefault(pedido.cliente_id, {
                'cliente_id': pedido.cliente_id,
                'cliente': pedido.cliente.nombre if pedido.cliente else f'Cliente #{pedido.cliente_id}',
                'telefono': pedido.cliente.telefono if pedido.cliente else None,
                'pedidos': 0, 'total': 0.0, 'ultima_compra': None})
            c['pedidos'] += 1
            c['total'] += pedido.total
            momento = pago.fecha.isoformat()
            if c['ultima_compra'] is None or momento > c['ultima_compra']:
                c['ultima_compra'] = momento
        for nombre, cantidad, subtotal in _lineas(pedido):
            p = por_producto.setdefault(nombre, {'producto': nombre, 'cantidad': 0, 'total': 0.0})
            p['cantidad'] += cantidad
            p['total'] += subtotal

    total_vendido = sum(d['total'] for d in por_dia.values())
    n_pedidos = sum(d['pedidos'] for d in por_dia.values())

    # Días sin ventas también aparecen, en cero.
    dias = []
    dia = inicio
    while dia <= fin:
        dias.append(por_dia.get(dia.isoformat(), {'fecha': dia.isoformat(), 'pedidos': 0, 'total': 0.0}))
        dia += timedelta(days=1)

    cancelaciones = []
    for pedido_id, devoluciones in cancelados.items():
        pedido = Pedido.query.get(pedido_id)
        ultima = max(devoluciones, key=lambda p: p.fecha)
        cancelaciones.append({
            'pedido_id': pedido.id,
            'ficha': pedido.numero_turno,
            'fecha': ultima.fecha.isoformat(),
            'total_devuelto': round(sum(-p.monto for p in devoluciones), 2),
            'motivo': pedido.motivo_cancelacion,
            'cajero': pedido.usuario.nombre if pedido.usuario else None,
            'cancelado_por': ultima.usuario.nombre if ultima.usuario else None,
        })
    cancelaciones.sort(key=lambda c: c['fecha'], reverse=True)

    gastos_cat = {}
    gastos_total = 0.0
    gastos = (GastoCaja.query.filter(GastoCaja.fecha >= desde_utc, GastoCaja.fecha < hasta_utc,
                                     GastoCaja.anulado == False).all())  # noqa: E712
    for g in gastos:
        if not _en_rango(g.fecha, inicio, fin):
            continue
        fila = gastos_cat.setdefault(g.categoria, {
            'categoria': g.categoria, 'nombre': CATEGORIAS_GASTO.get(g.categoria, g.categoria),
            'cantidad': 0, 'total': 0.0})
        fila['cantidad'] += 1
        fila['total'] += g.monto
        gastos_total += g.monto

    def redondeado(items, *claves):
        return [{**i, **{k: round(i[k], 2) for k in claves}} for i in items]

    return {
        'desde': inicio.isoformat(),
        'hasta': fin.isoformat(),
        'total_vendido': round(total_vendido, 2),
        'pedidos': n_pedidos,
        'ticket_promedio': round(total_vendido / n_pedidos, 2) if n_pedidos else 0.0,
        'total_devuelto': round(devuelto, 2),
        'por_dia': redondeado(dias, 'total'),
        'por_metodo': redondeado(sorted(por_metodo.values(), key=lambda m: -m['total']), 'total'),
        'por_producto': redondeado(
            sorted(por_producto.values(), key=lambda p: -p['total'])[:TOP_PRODUCTOS], 'cantidad', 'total'),
        'cancelaciones': cancelaciones,
        'gastos': {'total': round(gastos_total, 2),
                   'por_categoria': redondeado(sorted(gastos_cat.values(), key=lambda f: -f['total']), 'total')},
        'envios': {'pedidos': envios_pedidos, 'total': round(envios_total, 2)},
        'descuentos': {'pedidos': descuentos_pedidos, 'total': round(descuentos_total, 2)},
        'por_repartidor': redondeado(sorted(por_repartidor.values(), key=lambda r: -r['entregas']), 'envios'),
        'mejores_clientes': redondeado(
            sorted(por_cliente.values(), key=lambda c: (-c['total'], -c['pedidos']))[:TOP_CLIENTES], 'total'),
    }
