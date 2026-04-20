from flask import Blueprint, request
from flask_restful import Api, Resource
from flask_jwt_extended import jwt_required

from ..models import Cliente
from .schemas import ClienteSchema

clientes_v1_0_bp = Blueprint('clientes_v1_0_bp', __name__)
api = Api(clientes_v1_0_bp)

cliente_schema = ClienteSchema()
clientes_schema = ClienteSchema(many=True)

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
            data = request.get_json()
            campos_requeridos = ['nombre', 'telefono', 'direccion','nit']
            if not data or not all(k in data for k in campos_requeridos):
                return {'error': 'Faltan datos requeridos'}, 400

            nombre = data['nombre'].strip()
            telefono = data['telefono'].strip()
            direccion = data['direccion'].strip()
            nit=data['nit'].strip()
            correo = data.get('correo')

            cliente = Cliente(nombre, telefono, direccion, correo=correo, nit=nit)
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

            data = request.get_json()
            if 'nombre' in data:
                cliente.nombre = data['nombre'].strip()
            if 'telefono' in data:
                cliente.telefono = data['telefono'].strip()
            if 'direccion' in data:
                cliente.direccion = data['direccion'].strip()
            if 'correo' in data:
                cliente.correo = data['correo']

            cliente.session.commit()
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
