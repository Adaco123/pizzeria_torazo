from flask import Blueprint, request
from flask_restful import Api, Resource
from flask_jwt_extended import jwt_required
from sqlalchemy.exc import SQLAlchemyError, IntegrityError

from app.db import db
from app.pagos.models import Pago, MetodoPago
from app.factura.models import Factura
from app.users.models import Usuario

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
        data = request.get_json() or {}
        if not data.get('nombre', '').strip():
            return {'success': False, 'error': 'nombre es requerido'}, 400

        if MetodoPago.query.filter_by(nombre=data['nombre'].strip()).first():
            return {'success': False, 'error': f"Método '{data['nombre']}' ya existe"}, 409

        metodo = MetodoPago(nombre=data['nombre'].strip())
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

        data = request.get_json() or {}
        nombre = data.get('nombre', '').strip()
        if not nombre:
            return {'success': False, 'error': 'nombre es requerido'}, 400

        existente = MetodoPago.query.filter_by(nombre=nombre).first()
        if existente and existente.id != metodo_id:
            return {'success': False, 'error': f"Ya existe un método con nombre '{nombre}'"}, 409

        metodo.nombre = nombre
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
        _asegurar_metodos_pago_por_defecto()
        data = request.get_json() or {}

        for campo in ['factura_id', 'metodo_id', 'monto', 'usuario_id']:
            if data.get(campo) is None:
                return {'success': False, 'error': f'{campo} es requerido'}, 400

        factura = Factura.query.get(data['factura_id'])
        if not factura:
            return {'success': False, 'error': 'Factura no encontrada'}, 404

        if factura.anulada:
            return {'success': False, 'error': 'No se puede pagar una factura anulada'}, 400

        metodo = MetodoPago.query.get(data['metodo_id'])
        if not metodo:
            return {'success': False, 'error': 'Método de pago no encontrado'}, 404

        usuario = Usuario.query.get(data['usuario_id'])
        if not usuario:
            return {'success': False, 'error': 'Usuario no encontrado'}, 404

        # ── Validar monto_recibido solo para efectivo ─────────────────────
        monto_recibido = data.get('monto_recibido')
        if metodo.nombre.lower() == 'efectivo':
            if monto_recibido is None:
                return {'success': False, 'error': 'monto_recibido es requerido para efectivo'}, 400
            if float(monto_recibido) < float(data['monto']):
                return {'success': False, 'error': 'monto_recibido no puede ser menor al monto'}, 400

        pago = Pago(
            factura_id     = data['factura_id'],
            metodo_id      = data['metodo_id'],
            monto          = float(data['monto']),
            usuario_id     = data['usuario_id'],
            monto_recibido = float(monto_recibido) if monto_recibido is not None else None,
        )

        try:
            db.session.add(pago)
            db.session.commit()
            return {'success': True, 'data': pago_schema.dump(pago)}, 201
        except SQLAlchemyError as e:
            db.session.rollback()
            return {'success': False, 'error': str(e)}, 500


class PagoResource(Resource):

    @jwt_required()
    def get(self, pago_id):
        pago = Pago.query.get(pago_id)
        if not pago:
            return {'success': False, 'error': 'Pago no encontrado'}, 404
        return {'success': True, 'data': pago_schema.dump(pago)}, 200

    @jwt_required()
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