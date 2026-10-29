from flask import Blueprint, request
from flask_restful import Api, Resource
from flask_jwt_extended import jwt_required
from marshmallow import ValidationError

from ..models import Combo, ComboProducto
from .schemas import (
    ComboSchema, ComboUpdateSchema,
    ComboProductoSchema, ComboProductoUpdateSchema,
)

combos_v1_0_bp = Blueprint('combos_v1_0_bp', __name__)
api = Api(combos_v1_0_bp)

combo_schema = ComboSchema()
combos_schema = ComboSchema(many=True)
combo_producto_schema = ComboProductoSchema()
combos_producto_schema = ComboProductoSchema(many=True)
combo_update_schema = ComboUpdateSchema()
combo_producto_update_schema = ComboProductoUpdateSchema()


def _cargar(schema, data):
    """Valida con el schema. Devuelve (datos_limpios, None) o (None, (respuesta, 400))."""
    try:
        return schema.load(data), None
    except ValidationError as err:
        return None, (err.messages, 400)


class CombosListResource(Resource):
    @jwt_required()
    def get(self):
        """List all combos"""
        combos = Combo.query.all()
        return combos_schema.dump(combos), 200

    @jwt_required()
    def post(self):
        """Create a new combo"""
        data, error = _cargar(combo_schema, request.get_json())
        if error:
            return error

        combo = Combo(**data)
        combo.save()
        return combo_schema.dump(combo), 201


class ComboResource(Resource):
    @jwt_required()
    def get(self, combo_id):
        """Get a specific combo"""
        combo = Combo.query.get_or_404(combo_id)
        return combo_schema.dump(combo), 200

    @jwt_required()
    def put(self, combo_id):
        """Update a combo (price)"""
        combo = Combo.query.get_or_404(combo_id)
        # Only allow updating precio and activo (ComboUpdateSchema ignores the rest)
        data, error = _cargar(combo_update_schema, request.get_json())
        if error:
            return error

        for key, value in data.items():
            setattr(combo, key, value)
        combo.save()
        return combo_schema.dump(combo), 200

    @jwt_required()
    def delete(self, combo_id):
        """Delete a combo"""
        combo = Combo.query.get_or_404(combo_id)
        combo.delete()
        return '', 204


class ComboToggleActiveResource(Resource):
    @jwt_required()
    def patch(self, combo_id):
        """Activate/deactivate a combo"""
        combo = Combo.query.get_or_404(combo_id)
        combo.activo = not combo.activo
        combo.save()
        return combo_schema.dump(combo), 200


class ComboProductosResource(Resource):
    @jwt_required()
    def get(self, combo_id):
        """List products in a combo"""
        combo_productos = ComboProducto.query.filter_by(combo_id=combo_id).all()
        return combos_producto_schema.dump(combo_productos), 200

    @jwt_required()
    def post(self, combo_id):
        """Add a product to a combo with quantity"""
        data = request.get_json()
        if isinstance(data, dict):
            data = {**data, 'combo_id': combo_id}  # el id de la URL manda
        data, error = _cargar(combo_producto_schema, data)
        if error:
            return error

        combo_producto = ComboProducto(**data)
        combo_producto.save()
        return combo_producto_schema.dump(combo_producto), 201


class ComboProductoResource(Resource):
    @jwt_required()
    def put(self, combo_id, producto_id):
        """Update quantity of a product in combo"""
        combo_producto = ComboProducto.query.get_or_404((combo_id, producto_id))
        data, error = _cargar(combo_producto_update_schema, request.get_json())
        if error:
            return error

        if 'cantidad' in data:
            combo_producto.cantidad = data['cantidad']
            combo_producto.save()
        return combo_producto_schema.dump(combo_producto), 200

    @jwt_required()
    def delete(self, combo_id, producto_id):
        """Remove a product from a combo"""
        combo_producto = ComboProducto.query.get_or_404((combo_id, producto_id))
        combo_producto.delete()
        return '', 204


api.add_resource(CombosListResource, '/api/v1.0/combos/', endpoint='combos_list')
api.add_resource(ComboResource, '/api/v1.0/combos/<int:combo_id>', endpoint='combo_detail')
api.add_resource(ComboToggleActiveResource, '/api/v1.0/combos/<int:combo_id>/toggle-active', endpoint='combo_toggle_active')

api.add_resource(ComboProductosResource, '/api/v1.0/combos/<int:combo_id>/productos', endpoint='combo_productos')
api.add_resource(ComboProductoResource, '/api/v1.0/combos/<int:combo_id>/productos/<int:producto_id>', endpoint='combo_producto_detail')