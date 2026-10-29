from flask import Blueprint, request
from flask_restful import Api, Resource
from flask_jwt_extended import jwt_required
from sqlalchemy.exc import IntegrityError

from app.db import db
from app.pedidos.models import Pedido
from app.repartidores.models import Repartidor, TIPOS_REPARTIDOR
from app.util.decorador_admin import admin_required

repartidores_v1_0_bp = Blueprint('repartidores_v1_0_bp', __name__)
api = Api(repartidores_v1_0_bp)


def _json(r):
    return {'id': r.id, 'nombre': r.nombre, 'tipo': r.tipo, 'telefono': r.telefono, 'activo': r.activo}


def _validar(data, parcial=False):
    """Devuelve (campos_limpios, error)."""
    limpio = {}
    if 'nombre' in data or not parcial:
        nombre = (data.get('nombre') or '').strip()
        if not nombre:
            return None, 'Escribe el nombre del repartidor o la empresa'
        if len(nombre) > 80:
            return None, 'El nombre es demasiado largo (máximo 80 letras)'
        limpio['nombre'] = nombre
    if 'tipo' in data:
        if data['tipo'] not in TIPOS_REPARTIDOR:
            return None, 'El tipo debe ser "persona" o "empresa"'
        limpio['tipo'] = data['tipo']
    if 'telefono' in data:
        telefono = (data['telefono'] or '').strip() or None
        if telefono and len(telefono) > 30:
            return None, 'El teléfono es demasiado largo'
        limpio['telefono'] = telefono
    if 'activo' in data:
        if not isinstance(data['activo'], bool):
            return None, 'activo debe ser verdadero o falso'
        limpio['activo'] = data['activo']
    return limpio, None


class RepartidoresResource(Resource):

    @jwt_required()
    def get(self):
        """El cajero ve solo los activos (para elegir); el admin puede pedir todos con ?todos=1."""
        from flask_jwt_extended import current_user
        from app.users.models import ROL_ADMINISTRADOR
        query = Repartidor.query.order_by(Repartidor.nombre)
        es_admin = bool(current_user and current_user.rol and current_user.rol.nombre == ROL_ADMINISTRADOR)
        if not (es_admin and request.args.get('todos')):
            query = query.filter_by(activo=True)
        return {'success': True, 'data': [_json(r) for r in query.all()]}, 200

    @admin_required
    def post(self):
        limpio, error = _validar(request.get_json() or {})
        if error:
            return {'success': False, 'error': error}, 400
        if Repartidor.query.filter(db.func.lower(Repartidor.nombre) == limpio['nombre'].lower()).first():
            return {'success': False, 'error': f'Ya existe "{limpio["nombre"]}"'}, 409
        repartidor = Repartidor(**limpio)
        try:
            db.session.add(repartidor)
            db.session.commit()
        except IntegrityError:
            db.session.rollback()
            return {'success': False, 'error': f'Ya existe "{limpio["nombre"]}"'}, 409
        return {'success': True, 'data': _json(repartidor)}, 201


class RepartidorResource(Resource):

    @admin_required
    def put(self, repartidor_id):
        repartidor = Repartidor.query.get(repartidor_id)
        if not repartidor:
            return {'success': False, 'error': 'Repartidor no encontrado'}, 404
        limpio, error = _validar(request.get_json() or {}, parcial=True)
        if error:
            return {'success': False, 'error': error}, 400
        nombre = limpio.get('nombre')
        if nombre:
            repetido = Repartidor.query.filter(db.func.lower(Repartidor.nombre) == nombre.lower(),
                                               Repartidor.id != repartidor.id).first()
            if repetido:
                return {'success': False, 'error': f'Ya existe "{nombre}"'}, 409
        for campo, valor in limpio.items():
            setattr(repartidor, campo, valor)
        db.session.commit()
        return {'success': True, 'data': _json(repartidor)}, 200

    @admin_required
    def delete(self, repartidor_id):
        """Si ya hizo entregas no se borra (se desactiva) para no perder el historial."""
        repartidor = Repartidor.query.get(repartidor_id)
        if not repartidor:
            return {'success': False, 'error': 'Repartidor no encontrado'}, 404
        if Pedido.query.filter_by(repartidor_id=repartidor.id).first():
            return {'success': False,
                    'error': 'Ya tiene entregas registradas: desactívalo en lugar de borrarlo'}, 409
        db.session.delete(repartidor)
        db.session.commit()
        return {'success': True, 'message': 'Repartidor eliminado'}, 200


api.add_resource(RepartidoresResource, '/api/v1.0/repartidores')
api.add_resource(RepartidorResource, '/api/v1.0/repartidores/<int:repartidor_id>')
