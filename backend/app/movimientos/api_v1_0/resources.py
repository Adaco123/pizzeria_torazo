from flask import request
from flask_restful import Resource, Api
from flask_jwt_extended import jwt_required
from app.movimientos import servicio
from app.pedidos.servicio import manejar_reglas
from flask import Blueprint
from marshmallow import ValidationError
from app.db import db
from app.movimientos.models import MovimientoStock
from app.productos.models import Producto
from app.turnos.models import Turno
from app.movimientos.api_v1_0.schemas import (
    movimiento_stock_schema, movimientos_stock_schema, ajuste_stock_schema,
    list_query_schema, producto_query_schema,
)

movimientos_v1_0_bp = Blueprint('movimientos_v1_0_bp', __name__)
api = Api(movimientos_v1_0_bp)


def _cargar(schema, data):
    """Valida con el schema. Devuelve (datos_limpios, None) o (None, (respuesta, 400))."""
    try:
        return schema.load(data or {}), None
    except ValidationError as err:
        return None, ({'errors': err.messages}, 400)


class MovimientoStockListResource(Resource):

    @jwt_required()
    @manejar_reglas
    def post(self):
        """
        Registra una entrada de stock (llegó mercadería). Cajero o administrador; solo bebidas.
        Body: { "producto_id": int, "cantidad": int }
        """
        data, error = _cargar(movimiento_stock_schema, request.get_json())
        if error:
            return error
        producto = Producto.query.get(data['producto_id'])
        if not producto:
            return {'message': 'Producto no encontrado'}, 404

        movimiento = servicio.registrar_entrada(producto, data['cantidad'])
        return movimiento_stock_schema.dump(movimiento), 201

    @jwt_required()
    def get(self):
        """
        Lista todos los movimientos de stock (para admin/reporte).
        Query params opcionales: ?producto_id=X&limit=20
        """
        params, error = _cargar(list_query_schema, request.args.to_dict())
        if error:
            return error
        producto_id = params.get('producto_id')
        limit       = params['limit']

        query = MovimientoStock.query.order_by(MovimientoStock.fecha.desc())

        if producto_id:
            query = query.filter_by(producto_id=producto_id)

        movimientos = query.limit(limit).all()
        return movimientos_stock_schema.dump(movimientos), 200


class AjusteStockResource(Resource):

    @jwt_required()
    @manejar_reglas
    def post(self):
        """
        Corrige el stock de una bebida (botella rota, error al contar). Solo el administrador.
        Body: { "producto_id": int, "cantidad": int (con signo, no 0), "motivo": str }
        """
        data, error = _cargar(ajuste_stock_schema, request.get_json())
        if error:
            return error
        producto = Producto.query.get(data['producto_id'])
        if not producto:
            return {'message': 'Producto no encontrado'}, 404

        movimiento = servicio.ajustar_stock(producto, data['cantidad'], data['motivo'])
        return movimiento_stock_schema.dump(movimiento), 201


class MovimientoStockProductoResource(Resource):

    @jwt_required()
    def get(self, producto_id):
        """
        Devuelve los últimos movimientos de stock de un producto específico.
        Query param opcional: ?limit=10
        """
        params, error = _cargar(producto_query_schema, request.args.to_dict())
        if error:
            return error
        limit = params['limit']

        producto = Producto.query.get(producto_id)
        if not producto:
            return {'message': 'Producto no encontrado'}, 404

        movimientos = (
            MovimientoStock.query
            .filter_by(producto_id=producto_id)
            .order_by(MovimientoStock.fecha.desc())
            .limit(limit)
            .all()
        )

        return movimientos_stock_schema.dump(movimientos), 200
    
api.add_resource(MovimientoStockListResource,     '/api/stock/movimientos')
api.add_resource(AjusteStockResource,             '/api/stock/movimientos/ajuste')
api.add_resource(MovimientoStockProductoResource, '/api/stock/movimientos/<int:producto_id>')