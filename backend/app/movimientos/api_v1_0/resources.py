from flask import request
from flask_restful import Resource, Api
from flask_jwt_extended import jwt_required, get_jwt_identity
from flask import Blueprint
from app.db import db
from app.movimientos.models import MovimientoStock
from app.productos.models import Producto
from app.turnos.models import Turno
from app.movimientos.api_v1_0.schemas import movimiento_stock_schema, movimientos_stock_schema

movimientos_v1_0_bp = Blueprint('movimientos_v1_0_bp', __name__)
api = Api(movimientos_v1_0_bp)

class MovimientoStockListResource(Resource):

    @jwt_required()
    def post(self):
        """
        Añade stock a un producto y registra el movimiento.
        Body: { "producto_id": int, "cantidad": int }
        """
        usuario_id = get_jwt_identity()
        data = request.get_json()

        errors = movimiento_stock_schema.validate(data)
        if errors:
            return {'errors': errors}, 400
        producto_id = data['producto_id']
        cantidad    = data['cantidad']

        producto = Producto.query.get(producto_id)
        if not producto:
            return {'message': 'Producto no encontrado'}, 404


        turno_activo = Turno.query.filter_by(
            usuario_id=usuario_id,
            cierre=None
        ).order_by(Turno.apertura.desc()).first()

        turno_id = turno_activo.id if turno_activo else None

        stock_anterior = producto.stock if producto.stock is not None else 0
        stock_nuevo    = stock_anterior + cantidad

        producto.stock = stock_nuevo
        db.session.flush()


        movimiento = MovimientoStock(
            producto_id    = producto_id,
            usuario_id     = usuario_id,
            turno_id       = turno_id,
            cantidad       = cantidad,
            stock_anterior = stock_anterior,
            stock_nuevo    = stock_nuevo,
        )

        db.session.add(movimiento)
        db.session.commit()

        return movimiento_stock_schema.dump(movimiento), 201

    @jwt_required()
    def get(self):
        """
        Lista todos los movimientos de stock (para admin/reporte).
        Query params opcionales: ?producto_id=X&limit=20
        """
        producto_id = request.args.get('producto_id', type=int)
        limit       = request.args.get('limit', default=50, type=int)

        query = MovimientoStock.query.order_by(MovimientoStock.fecha.desc())

        if producto_id:
            query = query.filter_by(producto_id=producto_id)

        movimientos = query.limit(limit).all()
        return movimientos_stock_schema.dump(movimientos), 200


class MovimientoStockProductoResource(Resource):

    @jwt_required()
    def get(self, producto_id):
        """
        Devuelve los últimos movimientos de stock de un producto específico.
        Query param opcional: ?limit=10
        """
        limit = request.args.get('limit', default=10, type=int)

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
api.add_resource(MovimientoStockProductoResource, '/api/stock/movimientos/<int:producto_id>')