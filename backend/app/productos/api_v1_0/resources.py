from flask import Blueprint, request
from flask_restful import Api, Resource
from flask_jwt_extended import jwt_required

from app.db import db
from ..models import Categoria, Producto, ProductoTamano
from .schemas import CategoriaSchema, ProductoSchema, ProductoTamanoSchema

productos_v1_0_bp = Blueprint('productos_v1_0_bp', __name__)
api = Api(productos_v1_0_bp)

categoria_schema = CategoriaSchema()
categorias_schema = CategoriaSchema(many=True)
producto_schema = ProductoSchema()
productos_schema = ProductoSchema(many=True)
producto_tamano_schema = ProductoTamanoSchema()
productos_tamano_schema = ProductoTamanoSchema(many=True)

# Categorias que el sistema espera (el orden fija el id autoincremental).
# Los nombres importan: turnos, pedidos y stock buscan 'pizzas' / 'bebidas'.
CATEGORIAS_POR_DEFECTO = ["pizzas", "bebidas", "otros"]


def _asegurar_categorias_por_defecto():
    """Crea las categorias base que falten, sin tocar las existentes."""
    existentes = {c.nombre.lower() for c in Categoria.query.all()}
    faltantes = [n for n in CATEGORIAS_POR_DEFECTO if n not in existentes]
    for nombre in faltantes:
        db.session.add(Categoria(nombre=nombre))
    if faltantes:
        db.session.commit()



class CategoriasListResource(Resource):
    @jwt_required()
    def get(self):
        """List all categories"""
        _asegurar_categorias_por_defecto()
        categorias = Categoria.query.all()
        return {'message':'Sin problemas','data':categorias_schema.dump(categorias)}, 200

    @jwt_required()
    def post(self):
        """Create a new category"""
        data = request.get_json()
        errors = categoria_schema.validate(data)
        if errors:
            return errors, 400
        
        categoria = Categoria(**data)
        categoria.save()
        return categoria_schema.dump(categoria), 201


class CategoriaResource(Resource):
    @jwt_required()
    def get(self, categoria_id):
        """Get a specific category"""
        categoria = Categoria.query.get_or_404(categoria_id)
        return categoria_schema.dump(categoria), 200

    @jwt_required()
    def put(self, categoria_id):
        """Update a category"""
        categoria = Categoria.query.get_or_404(categoria_id)
        data = request.get_json()
        errors = categoria_schema.validate(data, partial=True)
        if errors:
            return errors, 400
        
        for key, value in data.items():
            setattr(categoria, key, value)
        categoria.save()
        return categoria_schema.dump(categoria), 200

    @jwt_required()
    def delete(self, categoria_id):
        """Delete a category"""
        categoria = Categoria.query.get_or_404(categoria_id)
        categoria.delete()
        return '', 204


class CategoriaToggleActiveResource(Resource):
    @jwt_required()
    def patch(self, categoria_id):
        """Activate/deactivate a category"""
        categoria = Categoria.query.get_or_404(categoria_id)
        categoria.activo = not categoria.activo
        categoria.save()
        return categoria_schema.dump(categoria), 200

class ProductosListResource(Resource):
    @jwt_required()
    def get(self):
        """List all products"""
        productos = Producto.query.all()
        return productos_schema.dump(productos), 200

    @jwt_required()
    def post(self):
        """Create a new product"""
        _asegurar_categorias_por_defecto()
        data = request.get_json()
        errors = producto_schema.validate(data)
        if errors:
            return errors, 400
        
        producto = Producto(**data)
        producto.save()
        return producto_schema.dump(producto), 201


class ProductoResource(Resource):
    @jwt_required()
    def get(self, producto_id):
        """Get a specific product"""
        producto = Producto.query.get_or_404(producto_id)
        return producto_schema.dump(producto), 200

    @jwt_required()
    def put(self, producto_id):
        """Update a product"""
        producto = Producto.query.get_or_404(producto_id)
        data = request.get_json()
        errors = producto_schema.validate(data, partial=True)
        if errors:
            return errors, 400
        
        for key, value in data.items():
            setattr(producto, key, value)
        producto.save()
        return producto_schema.dump(producto), 200

    @jwt_required()
    def delete(self, producto_id):
        """Delete a product"""
        producto = Producto.query.get_or_404(producto_id)
        producto.delete()
        return '', 204


class ProductoToggleActiveResource(Resource):
    @jwt_required()
    def patch(self, producto_id):
        """Activate/deactivate a product"""
        producto = Producto.query.get_or_404(producto_id)
        producto.activo = not producto.activo
        producto.save()
        return producto_schema.dump(producto), 200


class ProductosByCategoriaResource(Resource):
    @jwt_required()
    def get(self, categoria_id):
        """List products by category"""
        productos = Producto.query.filter_by(categoria_id=categoria_id).all()
        return productos_schema.dump(productos), 200

class ProductoTamanosResource(Resource):
    @jwt_required()
    def get(self, producto_id):

        producto_tamanos = ProductoTamano.query.filter_by(
            producto_id=producto_id
        ).all()

        resultado = []

        for pt in producto_tamanos:
            resultado.append({
                "tamano_id": pt.tamano_id,
                "tamano": pt.tamano.nombre,
                "precio": pt.precio
            })

        return resultado, 200

    @jwt_required()
    def post(self, producto_id):
        """Assign a size to a product with price"""
        data = request.get_json()
        data['producto_id'] = producto_id
        errors = producto_tamano_schema.validate(data)
        if errors:
            return errors, 400
        
        producto_tamano = ProductoTamano(**data)
        producto_tamano.save()
        return producto_tamano_schema.dump(producto_tamano), 201


class ProductoTamanoResource(Resource):
    @jwt_required()
    def delete(self, producto_id, tamano_id):
        """Remove a size from a product"""
        producto_tamano = ProductoTamano.query.get_or_404((producto_id, tamano_id))
        producto_tamano.delete()
        return '', 204
#bebidas
class ProductoStockResource(Resource):
    @jwt_required()
    def get(self, producto_id):
        """Ver stock actual de una bebida"""
        producto = Producto.query.get_or_404(producto_id)
        
        if producto.categoria.nombre.lower() != 'bebidas':
            return {'message': 'Este producto no es una bebida'}, 400
        
        return {
            'producto_id': producto.id,
            'nombre': producto.nombre,
            'stock': producto.stock
        }, 200

    @jwt_required()
    def post(self, producto_id):
        """Añadir stock a una bebida"""
        producto = Producto.query.get_or_404(producto_id)

        if producto.categoria.nombre.lower() != 'bebidas':
            return {'message': 'Este producto no es una bebida'}, 400

        data = request.get_json()
        cantidad = data.get('cantidad')

        if not cantidad or cantidad <= 0:
            return {'message': 'La cantidad debe ser mayor a 0'}, 400

        producto.stock = (producto.stock or 0) + cantidad
        producto.save()

        return {
            'message': f'Stock actualizado para {producto.nombre}',
            'stock_actual': producto.stock
        }, 200


class ProductosStockListResource(Resource):
    @jwt_required()
    def get(self):
        """Ver stock de todas las bebidas"""
        productos = (
            Producto.query
            .join(Categoria)
            .filter(Categoria.nombre.ilike('bebidas'))
            .all()
        )

        return {
            'data': [
                {
                    'producto_id': p.id,
                    'nombre': p.nombre,
                    'stock': p.stock,
                    'agotado': p.stock == 0
                }
                for p in productos
            ]
        }, 200
api.add_resource(ProductoStockResource, '/api/v1.0/productos/<int:producto_id>/stock', endpoint='producto_stock')
api.add_resource(ProductosStockListResource, '/api/v1.0/productos/stock/bebidas', endpoint='productos_stock_list')

api.add_resource(CategoriasListResource, '/api/v1.0/categorias/', endpoint='categorias_list')
api.add_resource(CategoriaResource, '/api/v1.0/categorias/<int:categoria_id>', endpoint='categoria_detail')
api.add_resource(CategoriaToggleActiveResource, '/api/v1.0/categorias/<int:categoria_id>/toggle-active', endpoint='categoria_toggle_active')

api.add_resource(ProductosListResource, '/api/v1.0/productos/', endpoint='productos_list')
api.add_resource(ProductoResource, '/api/v1.0/productos/<int:producto_id>', endpoint='producto_detail')
api.add_resource(ProductoToggleActiveResource, '/api/v1.0/productos/<int:producto_id>/toggle-active', endpoint='producto_toggle_active')
api.add_resource(ProductosByCategoriaResource, '/api/v1.0/categorias/<int:categoria_id>/productos', endpoint='productos_by_categoria')
#pizza con tramanos
api.add_resource(ProductoTamanosResource, '/api/v1.0/productos/<int:producto_id>/tamanos', endpoint='producto_tamanos')
#elemenar
api.add_resource(ProductoTamanoResource, '/api/v1.0/productos/<int:producto_id>/tamanos/<int:tamano_id>', endpoint='producto_tamano_detail')