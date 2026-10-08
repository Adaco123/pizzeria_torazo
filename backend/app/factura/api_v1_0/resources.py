from flask import Blueprint, request
from flask_restful import Api, Resource
from flask_jwt_extended import jwt_required
from sqlalchemy.exc import SQLAlchemyError, IntegrityError
from marshmallow import ValidationError

from app.db import db
from app.factura.models import Factura
from app.pedidos.models import Pedido

from .schemas import FacturaSchema

facturas_v1_0_bp = Blueprint('facturas_v1_0_bp', __name__)
api = Api(facturas_v1_0_bp)

factura_schema  = FacturaSchema()
facturas_schema = FacturaSchema(many=True)


def _cargar(schema, data, partial=False):
    """Valida con el schema. Devuelve (datos_limpios, None) o (None, (respuesta, 400))."""
    try:
        return schema.load(data or {}, partial=partial), None
    except ValidationError as err:
        return None, ({'success': False, 'errors': err.messages}, 400)


def _numero_en_uso(numero, excluir_id=None):
    query = Factura.query.filter_by(numero_factura=numero)
    if excluir_id:
        query = query.filter(Factura.id != excluir_id)
    return query.first() is not None


def _respuesta_numero_duplicado(numero):
    return {
        'success': False,
        'error': f"El número de factura '{numero}' ya existe"
    }, 409


class FacturaListResource(Resource):

    @jwt_required()
    def get(self):
        facturas = Factura.query.all()
        return {'success': True, 'data': facturas_schema.dump(facturas)}, 200

    @jwt_required()
    def post(self):
        data, error = _cargar(factura_schema, request.get_json())
        if error:
            return error

        numero = data['numero_factura']
        if _numero_en_uso(numero):
            return _respuesta_numero_duplicado(numero)

        pedido = Pedido.query.get(data['pedido_id'])
        if not pedido:
            return {'success': False, 'error': 'Pedido no encontrado'}, 404

        # La factura se emite cuando el cliente la pide, sobre un pedido ya cobrado.
        estado = pedido.estado.nombre if pedido.estado else None
        if estado == 'cancelado':
            return {'success': False, 'error': 'Un pedido cancelado no se puede facturar'}, 409
        if estado == 'pendiente' or pedido.pagado <= 0:
            return {'success': False, 'error': 'Cobra el pedido antes de emitir la factura'}, 409
        if Factura.query.filter_by(pedido_id=pedido.id, anulada=False).first():
            return {'success': False, 'error': 'Este pedido ya tiene una factura activa'}, 409

        subtotal = data.get('subtotal')
        if subtotal is None:
            subtotal = pedido.calcular_total()

        total_factura = (subtotal - data['descuento']) + data['impuesto']
        if abs(total_factura - pedido.pagado) > 0.005:
            return {
                'success': False,
                'error': f'La factura (Bs {total_factura:.2f}) debe coincidir con lo cobrado '
                         f'(Bs {pedido.pagado:.2f})'
            }, 400

        factura = Factura(
            numero_factura=numero,
            pedido_id=data['pedido_id'],
            cliente_id=data['cliente_id'],
            usuario_id=data['usuario_id'],
            subtotal=subtotal,
            descuento=data['descuento'],
            impuesto=data['impuesto'],
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

        data, error = _cargar(factura_schema, request.get_json(), partial=True)
        if error:
            return error

        if 'numero_factura' in data and _numero_en_uso(data['numero_factura'], excluir_id=factura_id):
            return _respuesta_numero_duplicado(data['numero_factura'])

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