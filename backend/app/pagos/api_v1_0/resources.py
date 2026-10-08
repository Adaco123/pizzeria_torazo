from flask import Blueprint, request
from flask_restful import Api, Resource
from flask_jwt_extended import jwt_required
from marshmallow import ValidationError
from sqlalchemy.exc import SQLAlchemyError, IntegrityError

from app.db import db
from app.pagos.models import Pago, MetodoPago
from app.factura.models import Factura
from app.users.models import Usuario
from app.util.decorador_admin import admin_required

from .schemas import PagoSchema, MetodoPagoSchema

pagos_v1_0_bp = Blueprint('pagos_v1_0_bp', __name__)
api = Api(pagos_v1_0_bp)

pago_schema        = PagoSchema()
pagos_schema       = PagoSchema(many=True)
metodo_schema      = MetodoPagoSchema()
metodos_schema     = MetodoPagoSchema(many=True)

# Metodos de pago base (el orden fija el id autoincremental).
# Ojo: pagos compara metodo.nombre.lower() == 'efectivo' para pedir monto_recibido.
METODOS_PAGO_POR_DEFECTO = ["Efectivo", "Qr"]


def _primer_mensaje(errores):
    """Baja por la estructura de errores de marshmallow hasta el primer texto."""
    if isinstance(errores, dict):
        errores = list(errores.values())
    if isinstance(errores, list):
        return _primer_mensaje(errores[0]) if errores else ''
    return str(errores)


def _cargar(schema, data):
    """Valida con el schema. Devuelve (datos_limpios, None) o (None, (respuesta, 400))."""
    try:
        return schema.load(data or {}), None
    except ValidationError as err:
        return None, ({'success': False, 'error': _primer_mensaje(err.messages)}, 400)


def _asegurar_metodos_pago_por_defecto():
    hay_nuevos = False
    for nombre in METODOS_PAGO_POR_DEFECTO:
        if not MetodoPago.query.filter_by(nombre=nombre).first():
            db.session.add(MetodoPago(nombre=nombre))
            hay_nuevos = True
    if hay_nuevos:
        db.session.commit()


class MetodoPagoListResource(Resource):

    @jwt_required()
    def get(self):
        _asegurar_metodos_pago_por_defecto()
        metodos = MetodoPago.query.all()
        return {'success': True, 'data': metodos_schema.dump(metodos)}, 200

    @jwt_required()
    def post(self):
        data, error = _cargar(metodo_schema, request.get_json())
        if error:
            return error

        metodo = MetodoPago(nombre=data['nombre'])
        try:
            db.session.add(metodo)
            db.session.commit()
            return {'success': True, 'data': metodo_schema.dump(metodo)}, 201
        except SQLAlchemyError as e:
            db.session.rollback()
            return {'success': False, 'error': str(e)}, 500


class MetodoPagoResource(Resource):

    @jwt_required()
    def get(self, metodo_id):
        metodo = MetodoPago.query.get(metodo_id)
        if not metodo:
            return {'success': False, 'error': 'Método de pago no encontrado'}, 404
        return {'success': True, 'data': metodo_schema.dump(metodo)}, 200

    @jwt_required()
    def put(self, metodo_id):
        metodo = MetodoPago.query.get(metodo_id)
        if not metodo:
            return {'success': False, 'error': 'Método de pago no encontrado'}, 404

        data, error = _cargar(MetodoPagoSchema(excluir_id=metodo_id), request.get_json())
        if error:
            return error

        metodo.nombre = data['nombre']
        try:
            db.session.commit()
            return {'success': True, 'data': metodo_schema.dump(metodo)}, 200
        except SQLAlchemyError as e:
            db.session.rollback()
            return {'success': False, 'error': str(e)}, 500

    @jwt_required()
    def delete(self, metodo_id):
        metodo = MetodoPago.query.get(metodo_id)
        if not metodo:
            return {'success': False, 'error': 'Método de pago no encontrado'}, 404

        if metodo.pagos:
            return {'success': False, 'error': 'No se puede eliminar, tiene pagos asociados'}, 409

        try:
            db.session.delete(metodo)
            db.session.commit()
            return {'success': True, 'message': 'Método eliminado'}, 200
        except SQLAlchemyError as e:
            db.session.rollback()
            return {'success': False, 'error': str(e)}, 500

class PagoListResource(Resource):

    @jwt_required()
    def get(self):
        factura_id = request.args.get('factura_id', type=int)
        query = Pago.query
        if factura_id:
            query = query.filter_by(factura_id=factura_id)
        pagos = query.all()
        return {'success': True, 'data': pagos_schema.dump(pagos), 'count': len(pagos)}, 200

    @jwt_required()
    def post(self):
        # El cobro ya no se registra pago por pago contra una factura: se cobra el pedido
        # completo con POST /pedidos/<id>/cobrar (valida turno, total, stock y ficha).
        return {
            'success': False,
            'error': 'Los cobros se registran con POST /api/v1.0/pedidos/<id>/cobrar',
        }, 409


class PagoResource(Resource):

    @jwt_required()
    def get(self, pago_id):
        pago = Pago.query.get(pago_id)
        if not pago:
            return {'success': False, 'error': 'Pago no encontrado'}, 404
        return {'success': True, 'data': pago_schema.dump(pago)}, 200

    @admin_required
    def delete(self, pago_id):
        pago = Pago.query.get(pago_id)
        if not pago:
            return {'success': False, 'error': 'Pago no encontrado'}, 404

        try:
            db.session.delete(pago)
            db.session.commit()
            return {'success': True, 'message': 'Pago eliminado'}, 200
        except SQLAlchemyError as e:
            db.session.rollback()
            return {'success': False, 'error': str(e)}, 500


api.add_resource(MetodoPagoListResource,
    '/api/v1.0/metodos-pago',
    endpoint='metodos_pago')

api.add_resource(MetodoPagoResource,
    '/api/v1.0/metodos-pago/<int:metodo_id>',
    endpoint='metodo_pago')

api.add_resource(PagoListResource,
    '/api/v1.0/pagos',
    endpoint='pagos')

api.add_resource(PagoResource,
    '/api/v1.0/pagos/<int:pago_id>',
    endpoint='pago')