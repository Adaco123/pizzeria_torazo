from flask import Blueprint, request
from flask_restful import Api, Resource
from sqlalchemy import func
from app.db import db

from app.users.models import Role, Usuario
from app.clientes.models import Cliente
from app.pedidos.models import Pedido
from app.factura.models import Factura
from app.util.decorador_admin import admin_required
from flask_jwt_extended import jwt_required

admin_v1_0_bp = Blueprint('admin_v1_0_bp', __name__)
api = Api(admin_v1_0_bp)

class UsuariosListResource(Resource):
    @admin_required
    def get(self):
        """Lista de todos los usuarios, para la pantalla de administración."""
        usuarios = Usuario.query.order_by(Usuario.nombre).all()
        return [{'id': u.id, 'nombre': u.nombre, 'correo': u.correo,
                 'rol': u.rol.nombre if u.rol else None, 'rol_id': u.rol_id,
                 'activo': u.activo, 'cedula': u.cedula, 'codigo': u.codigo} for u in usuarios], 200

class RolesListResource(Resource):
    @admin_required
    def get(self):
        """Roles disponibles para asignar a un usuario."""
        return [{'id': r.id, 'nombre': r.nombre} for r in Role.query.order_by(Role.id).all()], 200


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
    @admin_required
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

api.add_resource(UsuariosListResource, '/api/v1.0/usuarios')
api.add_resource(RolesListResource, '/api/v1.0/roles')
api.add_resource(ClientesTopComprasResource, '/api/v1.0/clientes/top-compras')
api.add_resource(EstadisticasResource, '/api/v1.0/estadisticas')
