from functools import wraps
from flask_jwt_extended import jwt_required, current_user
from app.users.models import ROL_ADMINISTRADOR

def admin_required(f):
    @wraps(f)
    @jwt_required()
    def funcion_decorada(*args, **kwargs):
        if current_user is None:
            return {'error': 'Usuario no encontrado'}, 404
        if not current_user or not current_user.rol or current_user.rol.nombre != ROL_ADMINISTRADOR:
            return {'error': 'Acceso denegado. Se requieren privilegios de administrador'}, 403
        return f(*args, **kwargs)
    return funcion_decorada