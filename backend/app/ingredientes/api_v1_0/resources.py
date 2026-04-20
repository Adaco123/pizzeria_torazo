from flask import Blueprint, request
from flask_restful import Api, Resource
from flask_jwt_extended import jwt_required

from ..models import Ingrediente, IngredienteTamano, ProductoIngrediente
from app.tamanos.models import Tamano
from .schemas import IngredienteSchema, ProductoIngredienteSchema, IngredienteTamanoSchema

ingredientes_v1_0_bp = Blueprint('ingredientes_v1_0_bp', __name__)
api = Api(ingredientes_v1_0_bp)

ingrediente_schema = IngredienteSchema()
ingredientes_schema = IngredienteSchema(many=True)
producto_ingrediente_schema = ProductoIngredienteSchema()
productos_ingrediente_schema = ProductoIngredienteSchema(many=True)
ingrediente_tamano_schema = IngredienteTamanoSchema()
ingredientes_tamanos_schema = IngredienteTamanoSchema(many=True)


class IngredientesListResource(Resource):
    @jwt_required()
    def get(self):
        """List all active ingredients"""
        ingredientes = Ingrediente.query.filter_by(activo=True).all()
        return ingredientes_schema.dump(ingredientes), 200

    @jwt_required()
    def post(self):
        """Create a new ingredient"""
        data = request.get_json()
        errors = ingrediente_schema.validate(data)
        if errors:
            return errors, 400
        
        ingrediente = Ingrediente(**data)
        ingrediente.save()
        return ingrediente_schema.dump(ingrediente), 201


class IngredienteResource(Resource):
    @jwt_required()
    def get(self, ingrediente_id):
        """Get a specific ingredient"""
        ingrediente = Ingrediente.query.get_or_404(ingrediente_id)
        return ingrediente_schema.dump(ingrediente), 200

    @jwt_required()
    def put(self, ingrediente_id):
        """Update an ingredient"""
        ingrediente = Ingrediente.query.get_or_404(ingrediente_id)
        data = request.get_json()
        errors = ingrediente_schema.validate(data, partial=True)
        if errors:
            return errors, 400
        
        for key, value in data.items():
            setattr(ingrediente, key, value)
        ingrediente.save()
        return ingrediente_schema.dump(ingrediente), 200

    @jwt_required()
    def delete(self, ingrediente_id):
        """Delete an ingredient"""
        ingrediente = Ingrediente.query.get_or_404(ingrediente_id)
        ingrediente.delete()
        return '', 204


class ProductoIngredientesResource(Resource):
    @jwt_required()
    def get(self, producto_id):
        """List ingredients for a product"""
        producto_ingredientes = ProductoIngrediente.query.filter_by(producto_id=producto_id).all()
        return productos_ingrediente_schema.dump(producto_ingredientes), 200

    @jwt_required()
    def post(self, producto_id):
        """Assign an ingredient to a product"""
        data = request.get_json()
        data['producto_id'] = producto_id
        errors = producto_ingrediente_schema.validate(data)
        if errors:
            return errors, 400
        
        producto_ingrediente = ProductoIngrediente(**data)
        producto_ingrediente.save()
        return producto_ingrediente_schema.dump(producto_ingrediente), 201


class ProductoIngredienteResource(Resource):
    @jwt_required()
    def delete(self, producto_id, ingrediente_id):
        """Remove an ingredient from a product"""
        producto_ingrediente = ProductoIngrediente.query.get_or_404((producto_id, ingrediente_id))
        producto_ingrediente.delete()
        return '', 204


class IngredienteTamanoListResource(Resource):
    @jwt_required()
    def get(self):
        registros = IngredienteTamano.query.all()
        return ingrediente_tamano_schema.dump(registros, many=True), 200

    @jwt_required()
    def post(self):
        data = request.get_json()
        errors = ingrediente_tamano_schema.validate(data)
        if errors:
            return errors, 400

        ingrediente = Ingrediente.query.get(data['ingrediente_id'])
        if not ingrediente:
            return {'msg': 'Ingrediente no existe'}, 404

        tamano = Tamano.query.get(data['tamano_id'])
        if not tamano:
            return {'msg': 'Tamaño no existe'}, 404

        existing = IngredienteTamano.query.filter_by(
            ingrediente_id=data['ingrediente_id'],
            tamano_id=data['tamano_id']
        ).first()
        if existing:
            return {'msg': 'Configuración ya existe'}, 409

        registro = IngredienteTamano(**data)
        registro.save()
        return ingrediente_tamano_schema.dump(registro), 201


class IngredienteTamanoResource(Resource):
    @jwt_required()
    def get(self, ingrediente_id, tamano_id):
        registro = IngredienteTamano.query.get_or_404((ingrediente_id, tamano_id))
        return ingrediente_tamano_schema.dump(registro), 200

    @jwt_required()
    def put(self, ingrediente_id, tamano_id):
        registro = IngredienteTamano.query.get_or_404((ingrediente_id, tamano_id))
        data = request.get_json()
        errors = ingrediente_tamano_schema.validate(data, partial=True)
        if errors:
            return errors, 400

        if 'precio_extra' in data:
            registro.precio_extra = data['precio_extra']

        registro.save()
        return ingrediente_tamano_schema.dump(registro), 200

    @jwt_required()
    def delete(self, ingrediente_id, tamano_id):
        registro = IngredienteTamano.query.get_or_404((ingrediente_id, tamano_id))
        registro.delete()
        return '', 204


api.add_resource(IngredientesListResource, '/api/v1.0/ingredientes/', endpoint='ingredientes_list')
api.add_resource(IngredienteResource, '/api/v1.0/ingredientes/<int:ingrediente_id>', endpoint='ingrediente_detail')
#ingredientes tamanoooos
api.add_resource(IngredienteTamanoListResource, '/api/v1.0/ingredientes/tamanos/', endpoint='ingredientes_tamanos_list')
api.add_resource(IngredienteTamanoResource, '/api/v1.0/ingredientes/<int:ingrediente_id>/tamanos/<int:tamano_id>', endpoint='ingrediente_tamano_detail')

api.add_resource(ProductoIngredientesResource, '/api/v1.0/productos/<int:producto_id>/ingredientes', endpoint='producto_ingredientes')
api.add_resource(ProductoIngredienteResource, '/api/v1.0/productos/<int:producto_id>/ingredientes/<int:ingrediente_id>', endpoint='producto_ingrediente_detail')