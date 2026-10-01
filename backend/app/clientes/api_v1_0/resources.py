from flask import Blueprint, request
from flask_restful import Api, Resource
from flask_jwt_extended import jwt_required
from marshmallow import ValidationError

from app.db import db
from ..models import Cliente
from .schemas import ClienteSchema, ClienteUpdateSchema

clientes_v1_0_bp = Blueprint('clientes_v1_0_bp', __name__)
api = Api(clientes_v1_0_bp)

cliente_schema = ClienteSchema()
clientes_schema = ClienteSchema(many=True)
cliente_update_schema = ClienteUpdateSchema()


def _primer_mensaje(errores):
    """Baja por la estructura de errores de marshmallow hasta el primer texto."""
    if isinstance(errores, dict):
        errores = list(errores.values())
    if isinstance(errores, list):
        return _primer_mensaje(errores[0]) if errores else ''
    return str(errores)


def _cargar(schema, data, partial=False):
    """Valida con el schema. Devuelve (datos_limpios, None) o (None, (respuesta, 400))."""
    if not isinstance(data, dict):
        return None, ({'error': 'El cuerpo de la petición debe ser un objeto JSON'}, 400)
    try:
        return schema.load(data, partial=partial), None
    except ValidationError as err:
        return None, ({'error': _primer_mensaje(err.messages), 'errors': err.messages}, 400)

class ClientesListResource(Resource):
    @jwt_required()
    def get(self):
        """Return list of all clients."""
        clientes = Cliente.query.all()
        return clientes_schema.dump(clientes), 200

    @jwt_required()
    def post(self):
        """Create a new client."""
        try:
            data, error = _cargar(cliente_schema, request.get_json())
            if error:
                return error

            cliente = Cliente(data['nombre'], data['telefono'], data['direccion'],
                              correo=data.get('correo'), nit=data['nit'])
            cliente.save()
            return {'message': 'Cliente creado correctamente', 'cliente': cliente_schema.dump(cliente)}, 201
        except Exception as e:
            return {'error': f'Error interno del servidor: {str(e)}'}, 500


class ClienteResource(Resource):
    @jwt_required()
    def get(self, id):
        cliente = Cliente.query.get(id)
        if not cliente:
            return {'error': 'Cliente no encontrado'}, 404
        return cliente_schema.dump(cliente), 200

    @jwt_required()
    def put(self, id):
        try:
            cliente = Cliente.query.get(id)
            if not cliente:
                return {'error': 'Cliente no encontrado'}, 404

            data, error = _cargar(cliente_update_schema, request.get_json(), partial=True)
            if error:
                return error

            for campo, valor in data.items():
                setattr(cliente, campo, valor)

            db.session.commit()
            return {'message': 'Cliente actualizado', 'cliente': cliente_schema.dump(cliente)}, 200
        except Exception as e:
            return {'error': f'Error interno del servidor: {str(e)}'}, 500

    @jwt_required()
    def delete(self, id):
        cliente = Cliente.query.get(id)
        if not cliente:
            return {'error': 'Cliente no encontrado'}, 404
        cliente.session.delete(cliente)
        cliente.session.commit()
        return {'message': 'Cliente eliminado'}, 200


# register routes
api.add_resource(ClientesListResource, '/api/v1.0/clientes/', endpoint='clientes_list')
api.add_resource(ClienteResource, '/api/v1.0/clientes/<int:id>', endpoint='cliente')