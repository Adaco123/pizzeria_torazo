from datetime import datetime, timedelta
from flask import Blueprint, request
from flask_restful import Api, Resource
from flask_jwt_extended import jwt_required, get_jwt_identity
from marshmallow import ValidationError
from app.db import db
from app.turnos.models import Turno
from app.users.models import Usuario
from .schemas import TurnoSchema
from sqlalchemy import func
from app.pedidos.models import Pedido, DetallePedido, DetalleMitad
from app.productos.models import Producto
from app.pedidos.servicio import pedidos_vendidos, totales_de_ventas
from app.movimientos.models import MovimientoStock
turnos_v1_0_bp = Blueprint('turnos_v1_0_bp', __name__)
api = Api(turnos_v1_0_bp)

turno_schema = TurnoSchema()
turnos_schema = TurnoSchema(many=True)


def _cargar_turno(data, partial=False):
    try:
        return turno_schema.load(data or {}, partial=partial), None
    except ValidationError as err:
        errores = err.messages
        while isinstance(errores, dict):
            errores = next(iter(errores.values()), '')
        while isinstance(errores, list):
            errores = errores[0] if errores else ''
        return None, ({'success': False, 'message': str(errores)}, 400)

# Cierre automatico: a la 1:00 AM hora Bolivia se cierra el turno que siga abierto.
# Bolivia = UTC-4 (sin horario de verano). La BD guarda las fechas en UTC (datetime.utcnow).
HORA_CIERRE_AUTOMATICO = 1
DESFASE_BOLIVIA = timedelta(hours=4)


def _ultimo_corte_utc(ahora_utc=None):
    """Ultima 1:00 AM hora Bolivia ya pasada, expresada en UTC."""
    ahora_utc = ahora_utc or datetime.utcnow()
    ahora_bo = ahora_utc - DESFASE_BOLIVIA
    corte_bo = ahora_bo.replace(hour=HORA_CIERRE_AUTOMATICO, minute=0, second=0, microsecond=0)
    if ahora_bo < corte_bo:
        corte_bo -= timedelta(days=1)
    return corte_bo + DESFASE_BOLIVIA


def _cerrar_turnos_vencidos(ahora_utc=None):
    """Cierra (con hora de cierre = 1:00 AM Bolivia) los turnos abiertos antes del ultimo corte.
    monto_cierre queda vacio: se completa despues con PUT /turnos/<id>."""
    corte = _ultimo_corte_utc(ahora_utc)
    vencidos = Turno.query.filter(Turno.cierre.is_(None), Turno.apertura < corte).all()
    for turno in vencidos:
        turno.cierre = corte
    if vencidos:
        db.session.commit()


class TurnosListResource(Resource):

    @jwt_required()
    def get(self):
        _cerrar_turnos_vencidos()
        turnos = Turno.query.order_by(Turno.id.desc()).all()
        return {
            "success": True,
            "data": turnos_schema.dump(turnos),
            "count": len(turnos)
        }, 200

    @jwt_required()
    def post(self):
        _cerrar_turnos_vencidos()
        payload, error = _cargar_turno(request.get_json())
        if error:
            return error
        usuario_id = payload['usuario_id']
        monto_inicio = payload['monto_inicio']

        usuario = Usuario.query.get(usuario_id)
        if not usuario:
            return {"success": False, "message": "Usuario no encontrado"}, 404

        turno_abierto = Turno.query.filter_by(usuario_id=usuario_id, cierre=None).first()
        if turno_abierto:
            return {
                "success": False,
                "message": "El usuario ya tiene un turno abierto",
                "data": turno_schema.dump(turno_abierto)
            }, 400

        try:
            turno = Turno(usuario_id=usuario_id, monto_inicio=monto_inicio)
            db.session.add(turno)
            db.session.commit()
            return {
                "success": True,
                "message": "Turno creado",
                "data": turno_schema.dump(turno)
            }, 201
        except Exception as e:
            db.session.rollback()
            return {"success": False, "message": "Error al crear turno", "error": str(e)}, 500


class TurnoResource(Resource):

    @jwt_required()
    def get(self, turno_id):
        _cerrar_turnos_vencidos()
        turno = Turno.query.get(turno_id)
        if not turno:
            return {"success": False, "message": "Turno no encontrado"}, 404
        return {"success": True, "data": turno_schema.dump(turno)}, 200

    @jwt_required()
    def put(self, turno_id):
        turno = Turno.query.get(turno_id)
        if not turno:
            return {"success": False, "message": "Turno no encontrado"}, 404

        data, error = _cargar_turno(request.get_json(), partial=True)
        if error:
            return error

        if "monto_inicio" in data:
            turno.monto_inicio = data["monto_inicio"]

        if "monto_cierre" in data:
            turno.monto_cierre = data["monto_cierre"]

        if "cierre" in data:
            turno.cierre = data["cierre"]

        db.session.commit()
        return {
            "success": True,
            "message": "Turno actualizado",
            "data": turno_schema.dump(turno)
        }, 200

    @jwt_required()
    def delete(self, turno_id):
        turno = Turno.query.get(turno_id)
        if not turno:
            return {"success": False, "message": "Turno no encontrado"}, 404
        db.session.delete(turno)
        db.session.commit()
        return {"success": True, "message": "Turno eliminado"}, 200


class TurnoCerrarResource(Resource):

    @jwt_required()
    def post(self, turno_id):
        turno = Turno.query.get(turno_id)
        if not turno:
            return {"success": False, "message": "Turno no encontrado"}, 404
        if not turno.abierto:
            return {"success": False, "message": "Turno ya está cerrado"}, 400

        data = request.get_json() or {}
        monto_cierre = data.get("monto_cierre")
        if monto_cierre is None:
            return {"success": False, "message": "monto_cierre es requerido"}, 400

        data, error = _cargar_turno({"monto_cierre": monto_cierre}, partial=True)
        if error:
            return error

        try:
            turno.cerrar(data["monto_cierre"])
            return {
                "success": True,
                "message": "Turno cerrado",
                "data": turno_schema.dump(turno)
            }, 200
        except Exception as e:
            db.session.rollback()
            return {"success": False, "message": "Error al cerrar turno", "error": str(e)}, 500


class TurnosAbiertosResource(Resource):

    @jwt_required()
    def get(self):
        _cerrar_turnos_vencidos()
        turnos = Turno.query.filter_by(cierre=None).all()
        return {
            "success": True,
            "data": turnos_schema.dump(turnos),
            "count": len(turnos)
        }, 200


class TurnoResumenResource(Resource):
   

    @jwt_required()
    def get(self, turno_id):
        _cerrar_turnos_vencidos()
        turno = Turno.query.get(turno_id)
        if not turno:
            return {'success': False, 'error': 'Turno no encontrado'}, 404

        
        # Ventas = pedidos cobrados y no cancelados; el dinero sale de los pagos, no de las facturas.
        pedidos_activos = pedidos_vendidos(turno_id)
        totales = totales_de_ventas(pedidos_activos)

        total_vendido  = totales['total_vendido']
        total_subtotal = totales['total_subtotal']
        total_impuesto = totales['total_impuesto']

        
        ventas_productos = {}

        for pedido in pedidos_activos:
            for detalle in pedido.detalles:

                if detalle.combo_id:
                    continue  

                if detalle.is_mitad:
                    for mitad in detalle.mitades:
                        pid = mitad.producto_id
                        if pid not in ventas_productos:
                            ventas_productos[pid] = {
                                'producto_id': pid,
                                'nombre':    mitad.producto.nombre if mitad.producto else f'Producto {pid}',
                                'categoria': mitad.producto.categoria.nombre if mitad.producto else '',
                                'tamanos':   {}
                            }
                        tamano_nombre = detalle.tamano.nombre if detalle.tamano else 'Sin tamaño'
                        key = f'{tamano_nombre} (mitad)'
                        if key not in ventas_productos[pid]['tamanos']:
                            ventas_productos[pid]['tamanos'][key] = {'cantidad': 0, 'subtotal': 0}
                        ventas_productos[pid]['tamanos'][key]['cantidad'] += detalle.cantidad
                        ventas_productos[pid]['tamanos'][key]['subtotal'] += round(detalle.subtotal / 2, 2)

                elif detalle.producto_id:
                    pid = detalle.producto_id
                    if pid not in ventas_productos:
                        ventas_productos[pid] = {
                            'producto_id': pid,
                            'nombre':    detalle.producto.nombre if detalle.producto else f'Producto {pid}',
                            'categoria': detalle.producto.categoria.nombre if detalle.producto else '',
                            'tamanos':   {}
                        }
                    tamano_nombre = detalle.tamano.nombre if detalle.tamano else 'Sin tamaño'
                    if tamano_nombre not in ventas_productos[pid]['tamanos']:
                        ventas_productos[pid]['tamanos'][tamano_nombre] = {'cantidad': 0, 'subtotal': 0}
                    ventas_productos[pid]['tamanos'][tamano_nombre]['cantidad'] += detalle.cantidad
                    ventas_productos[pid]['tamanos'][tamano_nombre]['subtotal'] += detalle.subtotal


        pizzas  = [v for v in ventas_productos.values() if v['categoria'].lower() == 'pizzas']
        bebidas = [v for v in ventas_productos.values() if v['categoria'].lower() == 'bebidas']
        otros   = [v for v in ventas_productos.values()
                   if v['categoria'].lower() not in ('pizzas', 'bebidas')]


        combos_vendidos = {}  

        for pedido in pedidos_activos:
            for detalle in pedido.detalles:
                if not detalle.combo_id:
                    continue
                cid = detalle.combo_id
                if cid not in combos_vendidos:
                    nombre = detalle.combo.nombre if detalle.combo else f'Combo {cid}'
                    combos_vendidos[cid] = {
                        'combo_id': cid,
                        'nombre':   nombre,
                        'cantidad': 0,
                        'subtotal': 0.0,
                    }
                combos_vendidos[cid]['cantidad'] += detalle.cantidad
                combos_vendidos[cid]['subtotal'] += detalle.subtotal

        combos_lista = sorted(
            combos_vendidos.values(),
            key=lambda x: x['subtotal'],
            reverse=True
        )

        from app.productos.models import Producto as Prod
        inventario_bebidas = []
        for prod in Prod.query.filter_by(activo=True).all():
            if prod.categoria.nombre.lower() != 'bebidas':
                continue
            vendidas = sum(
                t['cantidad']
                for v in bebidas
                if v['producto_id'] == prod.id
                for t in v['tamanos'].values()
            )
            inventario_bebidas.append({
                'producto_id':  prod.id,
                'nombre':       prod.nombre,
                'vendidas':     vendidas,
                'stock_actual': prod.stock if prod.stock is not None else 0,
            })


        try:
            
            movimientos_stock = (
                MovimientoStock.query
                .filter_by(turno_id=turno_id)
                .order_by(MovimientoStock.fecha.asc())
                .all()
            )
            movimientos_lista = [
                {
                    'id':              m.id,
                    'producto_nombre': m.producto.nombre if m.producto else '—',
                    'usuario_nombre':  m.usuario.nombre  if m.usuario  else '—',
                    'cantidad':        m.cantidad,
                    'stock_anterior':  m.stock_anterior,
                    'stock_nuevo':     m.stock_nuevo,
                    'fecha':           m.fecha.isoformat(),
                }
                for m in movimientos_stock
            ]
        except Exception:
            
            movimientos_lista = []

        
        extras_ingredientes = {}

        for pedido in pedidos_activos:
            for detalle in pedido.detalles:
                for extra in detalle.extras:
                    iid = extra.ingrediente_id
                    if iid not in extras_ingredientes:
                        nombre = extra.ingrediente.nombre if extra.ingrediente else f'Ingrediente {iid}'
                        extras_ingredientes[iid] = {
                            'ingrediente_id': iid,
                            'nombre':         nombre,
                            'cantidad':       0,
                            'ingreso':        0.0,
                        }
                    extras_ingredientes[iid]['cantidad'] += extra.cantidad
                    extras_ingredientes[iid]['ingreso']  += round(
                        extra.cantidad * extra.precio_extra, 2
                    )

        top_extras = sorted(
            extras_ingredientes.values(),
            key=lambda x: x['ingreso'],
            reverse=True
        )

        ventas_por_hora = {}
        for pedido in pedidos_activos:
            if pedido.fecha is None:
                continue
            hora = pedido.fecha.strftime('%H')
            if hora not in ventas_por_hora:
                ventas_por_hora[hora] = {'hora': int(hora), 'pedidos': 0, 'subtotal': 0.0}
            ventas_por_hora[hora]['pedidos']  += 1
            ventas_por_hora[hora]['subtotal'] += round(
                sum(d.subtotal for d in pedido.detalles), 2
            )

        ventas_por_hora_lista = sorted(ventas_por_hora.values(), key=lambda x: x['hora'])


        return {
            'success': True,
            'data': {

                'turno_id':     turno.id,
                'usuario':      turno.usuario.nombre if turno.usuario else '',
                'apertura':     turno.apertura.isoformat(),
                'cierre':       turno.cierre.isoformat() if turno.cierre else None,
                'monto_inicio': turno.monto_inicio,
                'monto_cierre': turno.monto_cierre,

                'total_pedidos':  len(pedidos_activos),
                'total_facturas': totales['total_facturas'],
                'total_subtotal': round(total_subtotal, 2),
                'total_impuesto': round(total_impuesto, 2),
                'total_vendido':  round(total_vendido,  2),
                'pagos_por_metodo': totales['pagos_por_metodo'],

                'pizzas':  pizzas,
                'bebidas': bebidas,
                'otros':   otros,

                'combos': combos_lista,

                'inventario_bebidas': inventario_bebidas,

                'movimientos_stock': movimientos_lista,

                'top_extras': top_extras,

                'ventas_por_hora': ventas_por_hora_lista,
            }
        }, 200


api.add_resource(TurnoResumenResource,   '/api/v1.0/turnos/<int:turno_id>/resumen', endpoint='turno_resumen')
api.add_resource(TurnosListResource,     '/api/v1.0/turnos',                        endpoint='turnos_list')
api.add_resource(TurnoResource,          '/api/v1.0/turnos/<int:turno_id>',         endpoint='turno_detail')
api.add_resource(TurnoCerrarResource,    '/api/v1.0/turnos/<int:turno_id>/cerrar',  endpoint='turno_cerrar')
api.add_resource(TurnosAbiertosResource, '/api/v1.0/turnos/abiertos',               endpoint='turnos_abiertos')