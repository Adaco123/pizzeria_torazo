from flask import Blueprint, request
from flask_restful import Api, Resource
from flask_jwt_extended import jwt_required
from sqlalchemy.exc import SQLAlchemyError, IntegrityError
from marshmallow import ValidationError

from app.db import db
from app.factura.models import Factura
from app.pedidos.models import Pedido
from app.clientes.models import Cliente
from app.users.models import Usuario

from .schemas import FacturaSchema

facturas_v1_0_bp = Blueprint('facturas_v1_0_bp', __name__)
api = Api(facturas_v1_0_bp)

factura_schema  = FacturaSchema()
facturas_schema = FacturaSchema(many=True)


class FacturaListResource(Resource):

    @jwt_required()
    def get(self):
        facturas = Factura.query.all()
        return {'success': True, 'data': facturas_schema.dump(facturas)}, 200

    @jwt_required()
    def post(self):
        data = request.get_json() or {}


        try:
            errors = factura_schema.validate(data)
            if errors:
                return {'success': False, 'errors': errors}, 400
        except ValidationError as ve:
            return {'success': False, 'errors': ve.messages}, 400

        pedido = Pedido.query.get(data['pedido_id'])
        if not pedido:
            return {'success': False, 'error': f"Pedido {data['pedido_id']} no existe"}, 404

        cliente = Cliente.query.get(data['cliente_id'])
        if not cliente:
            return {'success': False, 'error': f"Cliente {data['cliente_id']} no existe"}, 404

        usuario = Usuario.query.get(data['usuario_id'])
        if not usuario:
            return {'success': False, 'error': f"Usuario {data['usuario_id']} no existe"}, 404

        subtotal = data.get('subtotal')
        if subtotal is None:
            subtotal = pedido.calcular_total()

        numero = data.get('numero_factura', '').strip()
        if not numero:
            return {'success': False, 'error': 'numero_factura es requerido'}, 400

        if Factura.query.filter_by(numero_factura=numero).first():
            return {
                'success': False,
                'error': f"El número de factura '{numero}' ya existe"
            }, 409   


        factura = Factura(
            numero_factura=numero,
            pedido_id=data['pedido_id'],
            cliente_id=data['cliente_id'],
            usuario_id=data['usuario_id'],
            subtotal=subtotal,
            descuento=data.get('descuento', 0),
            impuesto=data.get('impuesto', 0),
        )

        try:
            db.session.add(factura)
            db.session.commit()
            return {'success': True, 'data': factura_schema.dump(factura)}, 201

        except IntegrityError as e:
            db.session.rollback()
            # FIX: atrapar específicamente duplicados que se cuelen por race condition
            return {
                'success': False,
                'error': 'Número de factura duplicado (IntegrityError)',
                'detail': str(e.orig)
            }, 409

        except SQLAlchemyError as e:
            db.session.rollback()
            return {
                'success': False,
                'error': 'Error de base de datos',
                'detail': str(e)
            }, 500
class FacturaResource(Resource):

    @jwt_required()
    def get(self, factura_id):
        factura = Factura.query.get(factura_id)
        if not factura:
            return {'success': False, 'error': 'Factura no encontrada'}, 404
        return {'success': True, 'data': factura_schema.dump(factura)}, 200

    @jwt_required()
    def put(self, factura_id):
        factura = Factura.query.get(factura_id)
        if not factura:
            return {'success': False, 'error': 'Factura no encontrada'}, 404

        data = request.get_json() or {}

        try:
            errors = factura_schema.validate(data, partial=True)
            if errors:
                return {'success': False, 'errors': errors}, 400
        except ValidationError as ve:
            return {'success': False, 'errors': ve.messages}, 400

        if 'numero_factura' in data:
            factura.numero_factura = data['numero_factura']
        if 'descuento' in data:
            factura.descuento = data['descuento']
        if 'impuesto' in data:
            factura.impuesto = data['impuesto']
        if 'subtotal' in data:
            factura.subtotal = data['subtotal']

        factura.calcular_total()

        try:
            db.session.commit()
        except SQLAlchemyError as e:
            db.session.rollback()
            return {'success': False, 'error': str(e)}, 500

        return {'success': True, 'data': factura_schema.dump(factura)}, 200


class FacturaAnularResource(Resource):

    @jwt_required()
    def patch(self, factura_id):
        factura = Factura.query.get(factura_id)
        if not factura:
            return {'success': False, 'error': 'Factura no encontrada'}, 404

        factura.anular()
        return {
            'success': True,
            'message': 'Factura anulada',
            'data': factura_schema.dump(factura)
        }, 200


api.add_resource(FacturaListResource,   '/api/v1.0/facturas',                    endpoint='facturas')
api.add_resource(FacturaResource,       '/api/v1.0/facturas/<int:factura_id>',   endpoint='factura')
api.add_resource(FacturaAnularResource, '/api/v1.0/facturas/<int:factura_id>/anular', endpoint='factura_anular')