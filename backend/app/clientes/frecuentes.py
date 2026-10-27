"""Clientes frecuentes: historial de pedidos y "repetir el último pedido"."""
from app.db import db
from app.ingredientes.models import Ingrediente, IngredienteTamano
from app.combos.models import Combo
from app.pedidos import servicio
from app.pedidos.models import (DetalleExtra, DetalleMitad, DetalleMitadExtra, DetallePedido,
                                Pedido)
from app.productos.models import ProductoTamano

MAX_HISTORIAL = 50
CLIENTE_MOSTRADOR = 1     # el cliente anónimo por defecto: no cuenta como "cliente frecuente"


def pedidos_vendidos_de(cliente_id):
    """Pedidos ya cobrados y no cancelados del cliente, del más reciente al más antiguo."""
    pedidos = Pedido.query.filter_by(cliente_id=cliente_id).order_by(Pedido.fecha.desc()).all()
    return [p for p in pedidos if servicio.estado_de(p) not in ('pendiente', 'cancelado')]


def resumen_de_items(pedido):
    partes = []
    for d in pedido.detalles:
        if d.is_mitad and d.mitades:
            nombre = ' / '.join(m.producto.nombre for m in d.mitades if m.producto)
        elif d.combo is not None:
            nombre = f'Combo {d.combo.nombre}'
        else:
            nombre = d.producto.nombre if d.producto else 'Producto eliminado'
        tamano = f' ({d.tamano.nombre})' if d.tamano else ''
        partes.append(f'{d.cantidad} x {nombre}{tamano}')
    return ', '.join(partes)


def historial_de_cliente(cliente):
    vendidos = pedidos_vendidos_de(cliente.id)
    return {
        'cliente': {'id': cliente.id, 'nombre': cliente.nombre, 'telefono': cliente.telefono},
        'num_pedidos': len(vendidos),
        'total_gastado': round(sum(p.total for p in vendidos), 2),
        'ultima_compra': vendidos[0].fecha.isoformat() if vendidos else None,
        'pedidos': [{
            'id': p.id,
            'ficha': p.numero_turno,
            'fecha': p.fecha.isoformat(),
            'estado': servicio.estado_de(p),
            'tipo_entrega': p.tipo_entrega.nombre if p.tipo_entrega else None,
            'total': round(p.total, 2),
            'resumen': resumen_de_items(p),
        } for p in vendidos[:MAX_HISTORIAL]],
    }


class _Omitido(Exception):
    pass


def _disponible(producto, cantidad, borrador, esperado_pizza=False):
    """Levanta _Omitido con el motivo si el producto ya no se puede vender hoy."""
    if producto is None or not producto.activo:
        raise _Omitido('ya no se vende')
    if producto.agotado:
        raise _Omitido('está agotado')
    if servicio.es_bebida(producto):
        disponible = producto.stock or 0
        ya = servicio.cantidades_de_bebidas(borrador).get(producto.id, 0)
        if disponible < ya + cantidad:
            raise _Omitido(f'stock insuficiente (hay {disponible})')
    if esperado_pizza and not servicio.es_pizza(producto):
        raise _Omitido('ya no es una pizza')


def _extra_vigente(ingrediente_id, tamano_id):
    """(ingrediente, precio) actual de un extra, o None si ya no se ofrece."""
    ing = Ingrediente.query.get(ingrediente_id)
    if not ing or not ing.activo:
        return None
    precio = ing.precio_extra
    if tamano_id:
        it = IngredienteTamano.query.filter_by(ingrediente_id=ing.id, tamano_id=tamano_id).first()
        if it:
            precio = it.precio_extra
    return ing, float(precio)


def _copiar_linea(origen, borrador):
    """Copia una línea del pedido anterior con precios de hoy. Devuelve los extras omitidos."""
    if origen.is_mitad:
        productos = [m.producto for m in origen.mitades]
        for producto in productos:
            _disponible(producto, 0, borrador, esperado_pizza=True)
        precios = []
        for producto in productos:
            pt = ProductoTamano.query.filter_by(producto_id=producto.id, tamano_id=origen.tamano_id).first()
            if not pt:
                raise _Omitido(f'"{producto.nombre}" ya no se vende en ese tamaño')
            precios.append(pt.precio)
        linea = DetallePedido(pedido_id=borrador.id, tamano_id=origen.tamano_id, cantidad=origen.cantidad,
                              precio_unitario=max(precios), is_mitad=True, notas=origen.notas)
        db.session.add(linea)
        db.session.flush()
        omitidos = []
        for m in origen.mitades:
            nueva = DetalleMitad(linea.id, m.mitad, m.producto_id)
            db.session.add(nueva)
            db.session.flush()
            for e in m.extras:
                if _extra_vigente(e.ingrediente_id, origen.tamano_id):
                    db.session.add(DetalleMitadExtra(nueva.id, e.ingrediente_id, e.cantidad))
                else:
                    omitidos.append(e.ingrediente.nombre if e.ingrediente else 'extra')
        return omitidos

    if origen.combo_id:
        combo = Combo.query.get(origen.combo_id)
        if not combo or not combo.activo:
            raise _Omitido('el combo ya no está activo')
        db.session.add(DetallePedido(pedido_id=borrador.id, combo_id=combo.id, tamano_id=origen.tamano_id,
                                     cantidad=origen.cantidad, precio_unitario=float(combo.precio),
                                     notas=origen.notas))
        return []

    producto = origen.producto
    _disponible(producto, origen.cantidad, borrador)
    precio = float(producto.precio_base or 0)
    tamano_id = origen.tamano_id
    if not servicio.es_bebida(producto):
        tamanos = ProductoTamano.query.filter_by(producto_id=producto.id).all()
        if tamanos:
            elegido = next((t for t in tamanos if t.tamano_id == tamano_id), None)
            if not elegido:
                raise _Omitido('ya no se vende en ese tamaño')
            precio = float(elegido.precio)
        elif servicio.es_pizza(producto):
            raise _Omitido('no tiene precios cargados')
    else:
        tamano_id = None
    linea = DetallePedido(pedido_id=borrador.id, producto_id=producto.id, tamano_id=tamano_id,
                          cantidad=origen.cantidad, precio_unitario=precio, notas=origen.notas)
    db.session.add(linea)
    db.session.flush()
    omitidos = []
    for e in origen.extras:
        vigente = _extra_vigente(e.ingrediente_id, tamano_id)
        if vigente:
            db.session.add(DetalleExtra(linea.id, e.ingrediente_id, vigente[1], e.cantidad, tamano_id))
        else:
            omitidos.append(e.ingrediente.nombre if e.ingrediente else 'extra')
    return omitidos


def nombre_de_linea(d):
    if d.is_mitad and d.mitades:
        return ' / '.join(m.producto.nombre for m in d.mitades if m.producto)
    if d.combo is not None:
        return f'Combo {d.combo.nombre}'
    return d.producto.nombre if d.producto else 'Producto eliminado'


def repetir_ultimo_pedido(cliente, borrador):
    """Agrega al borrador lo mismo que pidió el cliente la última vez, con los precios de hoy.

    Lo que ya no se puede vender (agotado, sin stock, fuera del catálogo) se omite y se avisa.
    """
    vendidos = pedidos_vendidos_de(cliente.id)
    if not vendidos:
        raise servicio.ReglaNegocio(f'{cliente.nombre} todavía no tiene pedidos cobrados', 404)
    origen = vendidos[0]

    agregados, omitidos = 0, []
    for linea in origen.detalles:
        try:
            with db.session.begin_nested():
                extras_fuera = _copiar_linea(linea, borrador)
            agregados += 1
            for nombre in extras_fuera:
                omitidos.append({'nombre': f'Extra {nombre}', 'motivo': 'ya no se ofrece'})
        except _Omitido as motivo:
            omitidos.append({'nombre': nombre_de_linea(linea), 'motivo': str(motivo)})
        db.session.flush()
        db.session.expire(borrador, ['detalles'])
    servicio.recalcular_total(borrador)
    return {'pedido_origen': origen.id, 'agregados': agregados, 'omitidos': omitidos}
