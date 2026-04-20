from flask import Blueprint, request
from flask_restful import Api, Resource
from sqlalchemy import func
from app.db import db

from app.users.models import Usuario
from app.clientes.models import Cliente
from app.pedidos.models import Pedido
from app.factura.models import Factura
from app.util.decorador_admin import admin_required
from flask_jwt_extended import jwt_required

admin_v1_0_bp = Blueprint('admin_v1_0_bp', __name__)
api = Api(admin_v1_0_bp)

class UsuariosListResource(Resource):
    #@admin_required
    def get(self):
        """Return list of all users."""
        usuarios = Usuario.query.all()
        return [{'id': u.id, 'nombre': u.nombre, 'correo': u.correo, 'rol': u.rol.nombre if u.rol else None, 'activo': u.activo} for u in usuarios], 200

class ClientesTopComprasResource(Resource):
    @admin_required
    def get(self):
        """Return clients with most purchases."""
        # Contar pedidos por cliente
        clientes_compras = db.session.query(
            Cliente.nombre,
            func.count(Pedido.id).label('num_compras'),
            func.sum(Pedido.total).label('total_gastado')
        ).join(Pedido).group_by(Cliente.id).order_by(func.count(Pedido.id).desc()).all()

        return [{'nombre': c.nombre, 'num_compras': c.num_compras, 'total_gastado': c.total_gastado} for c in clientes_compras], 200

class EstadisticasResource(Resource):
    #@admin_required
    def get(self):
        """Return general statistics."""
        total_usuarios = Usuario.query.count()
        total_clientes = Cliente.query.count()
        total_pedidos = Pedido.query.count()
        total_ventas = db.session.query(func.sum(Pedido.total)).scalar() or 0
        pedidos_hoy = Pedido.query.filter(func.date(Pedido.fecha) == func.date(func.now())).count()

        return {
            'total_usuarios': total_usuarios,
            'total_clientes': total_clientes,
            'total_pedidos': total_pedidos,
            'total_ventas': total_ventas,
            'pedidos_hoy': pedidos_hoy
        }, 200

class UsuarioResource(Resource):
    #@admin_required
    def put(self, usuario_id):
        """Update a user (personal)."""
        usuario = Usuario.query.get(usuario_id)
        if not usuario:
            return {'message': 'Usuario no encontrado'}, 404

        data = request.get_json(force=True)
        if not data:
            return {'message': 'No data provided'}, 400

        # Campos permitidos para actualizar
        if 'nombre' in data:
            usuario.nombre = data['nombre']
        if 'correo' in data:
            correo_nuevo = data['correo']
            if correo_nuevo != usuario.correo and Usuario.query.filter_by(correo=correo_nuevo).first():
                return {'message': 'Correo ya está en uso'}, 400
            usuario.correo = correo_nuevo
        if 'cedula' in data:
            cedula_nueva = data['cedula']
            if cedula_nueva != usuario.cedula and Usuario.query.filter_by(cedula=cedula_nueva).first():
                return {'message': 'Cédula ya está en uso'}, 400
            usuario.cedula = cedula_nueva
        if 'rol_id' in data:
            usuario.rol_id = data['rol_id']
        if 'activo' in data:
            usuario.activo = bool(data['activo'])
        if 'codigo' in data:
            usuario.codigo = data['codigo']
        if 'contra' in data and data['contra']:
            usuario.set_password(data['contra'])

        db.session.commit()

        return {
            'id': usuario.id,
            'nombre': usuario.nombre,
            'correo': usuario.correo,
            'rol': usuario.rol.nombre if usuario.rol else None,
            'activo': usuario.activo,
            'cedula': usuario.cedula,
            'codigo': usuario.codigo
        }, 200

api.add_resource(UsuariosListResource, '/api/v1.0/usuarios')
api.add_resource(UsuarioResource, '/api/v1.0/usuarios/<int:usuario_id>')
api.add_resource(ClientesTopComprasResource, '/api/v1.0/clientes/top-compras')
api.add_resource(EstadisticasResource, '/api/v1.0/estadisticas')
