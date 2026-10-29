from flask import request, Blueprint
from flask_jwt_extended.exceptions import JWTExtendedException
from werkzeug.exceptions import HTTPException
from flask_restful import Api, Resource
from marshmallow import ValidationError
from .schemas import (UsuariosSchema, RegistroSchema, LoginSchema,
                      UsuarioEditSchema, CambiarContrasenaSchema, ResetearContrasenaSchema)
from app.db import db
from ..models import Usuario, Role, ROL_ADMINISTRADOR
from flask_jwt_extended import (create_access_token, jwt_required, current_user,
                                get_current_user, verify_jwt_in_request)
from app.util.decorador_admin import admin_required

usuarios_v1_0_bp = Blueprint('films_v1_0_bp', __name__)
usuarios_schema = UsuariosSchema()
registro_schema = RegistroSchema()
login_schema = LoginSchema()
usuario_edit_schema = UsuarioEditSchema()
cambiar_contrasena_schema = CambiarContrasenaSchema()
resetear_contrasena_schema = ResetearContrasenaSchema()
api = Api(usuarios_v1_0_bp)

# Roles base (el orden fija el id autoincremental: Administrador=1, Cajero=2, Pizzero=3, Mesero=4)
ROLES_POR_DEFECTO = [ROL_ADMINISTRADOR, "Cajero", "Pizzero", "Mesero"]


def _asegurar_roles_por_defecto():
    hay_nuevos = False
    for nombre in ROLES_POR_DEFECTO:
        if not Role.query.filter_by(nombre=nombre).first():
            db.session.add(Role(nombre=nombre))
            hay_nuevos = True
    if hay_nuevos:
        db.session.commit()

def _primer_mensaje(errores):
    """Primer texto de los errores de marshmallow (dict/lista, anidados o no)."""
    if isinstance(errores, dict):
        errores = list(errores.values())
    if isinstance(errores, list):
        return _primer_mensaje(errores[0]) if errores else ''
    return str(errores)


def _cargar(schema, data):
    """Valida con el schema. Devuelve (datos_limpios, None) o (None, (respuesta, 400))."""
    try:
        return schema.load(data or {}), None
    except ValidationError as err:
        return None, ({'error': _primer_mensaje(err.messages)}, 400)


def _es_admin(usuario):
    return bool(usuario and usuario.rol and usuario.rol.nombre == ROL_ADMINISTRADOR)


def _otros_admins_activos(excluir_id):
    """Cuántos administradores activos hay además del indicado."""
    return (Usuario.query.join(Role, Usuario.rol_id == Role.id)
            .filter(Role.nombre == ROL_ADMINISTRADOR, Usuario.activo.is_(True),
                    Usuario.id != excluir_id).count())


class Registro_Resource(Resource):
    def post(self):
        """Crea un usuario. Solo lo hace el administrador; la única excepción es el primer
        usuario del sistema (base vacía), que queda como administrador."""
        try:
            _asegurar_roles_por_defecto()
            es_primero = Usuario.query.count() == 0
            if not es_primero:
                try:
                    verify_jwt_in_request()
                except JWTExtendedException:
                    return {'error': 'Inicia sesión como administrador para crear usuarios'}, 401
                if not _es_admin(get_current_user()):
                    return {'error': 'Solo el administrador puede crear usuarios'}, 403

            datos_crudos = request.get_json()
            if es_primero and isinstance(datos_crudos, dict):
                admin = Role.query.filter_by(nombre=ROL_ADMINISTRADOR).first()
                datos_crudos = {**datos_crudos, 'rol_id': admin.id}
            data, error = _cargar(registro_schema, datos_crudos)
            if error:
                return error
            if Usuario.query.filter_by(cedula=data['cedula']).first():
                return {'error': f"La cédula {data['cedula']} ya está registrada"}, 409
            if Usuario.get_by_email(data['correo']):
                return {'error': f"El Email {data['correo']} ya esta siendo utilizado por otra persona"}, 409

            user = Usuario(nombre=data['nombre'], correo=data['correo'], contra=data['contra'],
                           rol_id=data['rol_id'], cedula=data['cedula'], codigo=data['codigo'])
            user.save()
            user_data = usuarios_schema.dump(user)
            return {'message': 'Trabajador Creado Exitosamente', 'user': user_data}, 201
        except Exception as e:
            return {'error': f'Error Interno del servidor: {str(e)}'}, 500


class Login_Resource(Resource):
    def post(self):
        try:
            data, error = _cargar(login_schema, request.get_json())
            if error:
                return error

            usuarios = Usuario.get_by_email(data['correo'])

            if usuarios is not None and usuarios.activo and usuarios.check_password(data['contra']):
                rol = usuarios.rol.nombre if usuarios.rol else None
                nombre = usuarios.nombre
                token = create_access_token(identity=str(usuarios.id), additional_claims={"role": rol})
                return {'access_token': token, 'message': 'Iniciado correctamente', 'rol': rol,
                        'nombre': nombre, 'id':           usuarios.id}, 200
            else:
                return {'error': 'Credenciales incorrectas o usuario inactivo'}, 401
        except HTTPException:
            raise
        except Exception as e:
            return {'error': f'Error interno del servidor: {str(e)}'}, 500


class Usuario_Resource(Resource):
    @jwt_required()
    def get(self):
        try:
            user = current_user
            if not user:
                return {'error': 'Usuario no encontrado'}, 404
            return {'user': usuarios_schema.dump(user)}, 200
        except HTTPException:
            raise
        except Exception as e:
            return {'error': f'Error interno del servidor: {str(e)}'}, 500


# Lo que un usuario común puede cambiar de sí mismo. El resto es del administrador.
CAMPOS_PROPIOS = {'nombre', 'codigo'}


class UsuarioEdit_Resource(Resource):
    @jwt_required()
    def put(self, usuario_id):
        try:
            user = Usuario.query.get_or_404(usuario_id)
            es_admin = _es_admin(current_user)

            if current_user.id != user.id and not es_admin:
                return {'error': 'No tienes permisos para editar este usuario'}, 403

            data, error = _cargar(usuario_edit_schema, request.get_json())
            if error:
                return error

            if not es_admin:
                vedados = sorted(set(data) - CAMPOS_PROPIOS)
                if vedados:
                    return {'error': 'Solo un administrador puede cambiar: ' + ', '.join(vedados)}, 403
            else:
                if user.id == current_user.id and data.get('activo') is False:
                    return {'error': 'No puedes desactivar tu propia cuenta'}, 409
                deja_de_ser_admin = (
                    _es_admin(user) and user.activo and (
                        data.get('activo') is False
                        or ('rol_id' in data and data['rol_id'] != user.rol_id
                            and not _rol_es_admin(data['rol_id']))))
                if deja_de_ser_admin and _otros_admins_activos(user.id) == 0:
                    return {'error': 'Tiene que quedar al menos un administrador activo'}, 409
                if 'correo' in data:
                    otro = Usuario.get_by_email(data['correo'])
                    if otro and otro.id != user.id:
                        return {'error': f"El correo {data['correo']} ya lo usa otra persona"}, 409
                if 'cedula' in data:
                    otro = Usuario.query.filter_by(cedula=data['cedula']).first()
                    if otro and otro.id != user.id:
                        return {'error': f"La cédula {data['cedula']} ya está registrada"}, 409

            for campo, valor in data.items():   # nombre, codigo, y (solo admin) rol_id, activo, correo, cedula
                setattr(user, campo, valor)

            user.save()
            user_data = usuarios_schema.dump(user)
            return {'message': 'Usuario actualizado exitosamente', 'user': user_data}, 200
        except HTTPException:
            raise
        except Exception as e:
            return {'error': f'Error interno del servidor: {str(e)}'}, 500


def _rol_es_admin(rol_id):
    rol = Role.query.get(rol_id)
    return bool(rol and rol.nombre == ROL_ADMINISTRADOR)


class ResetearContrasena_Resource(Resource):
    @admin_required
    def post(self, usuario_id):
        """El administrador le pone una contraseña nueva a otro usuario (olvidó la suya)."""
        try:
            user = Usuario.query.get_or_404(usuario_id)
            if user.id == current_user.id:
                return {'error': 'Para cambiar tu propia contraseña usa "Mi cuenta"'}, 409
            data, error = _cargar(resetear_contrasena_schema, request.get_json())
            if error:
                return error
            user.set_password(data['contra_nueva'])
            user.save()
            return {'message': f'Contraseña de {user.nombre} restablecida'}, 200
        except HTTPException:
            raise
        except Exception as e:
            return {'error': f'Error interno del servidor: {str(e)}'}, 500


class CambiarContrasena_Resource(Resource):
    @jwt_required()
    def post(self):
        try:
            data, error = _cargar(cambiar_contrasena_schema, request.get_json())
            if error:
                return error

            user = current_user
            if not user.check_password(data['contra_actual']):
                return {'error': 'La contraseña actual es incorrecta'}, 400
            if data['contra_actual'] == data['contra_nueva']:
                return {'error': 'La contraseña nueva debe ser distinta de la actual'}, 400

            user.set_password(data['contra_nueva'])
            user.save()
            return {'message': 'Contraseña cambiada exitosamente'}, 200
        except HTTPException:
            raise
        except Exception as e:
            return {'error': f'Error interno del servidor: {str(e)}'}, 500


class UsuariosList_Resource(Resource):
    @admin_required
    def get(self):
        try:
            query = Usuario.query
            rol_nombre = request.args.get('rol')
            activo_str = request.args.get('activo')
            
            if rol_nombre:
                role = Role.query.filter_by(nombre=rol_nombre).first()
                if role:
                    query = query.filter_by(rol_id=role.id)
                else:
                    return {'error': f'Rol {rol_nombre} no encontrado'}, 404
            
            if activo_str is not None:
                if activo_str.lower() == 'true':
                    activo = True
                elif activo_str.lower() == 'false':
                    activo = False
                else:
                    return {'error': 'activo debe ser true o false'}, 400
                query = query.filter_by(activo=activo)
            
            usuarios = query.all()
            return {'users': usuarios_schema.dump(usuarios, many=True)}, 200
        except HTTPException:
            raise
        except Exception as e:
            return {'error': f'Error interno del servidor: {str(e)}'}, 500

api.add_resource(Registro_Resource, '/api/v1.0/registrar/', '/Registro_Resource')
api.add_resource(Login_Resource, '/api/v1.0/login/', '/Login_Resource')
api.add_resource(Usuario_Resource, '/me')
api.add_resource(UsuarioEdit_Resource, '/api/v1.0/usuarios/<int:usuario_id>')
api.add_resource(ResetearContrasena_Resource, '/api/v1.0/usuarios/<int:usuario_id>/resetear-contrasena')
api.add_resource(CambiarContrasena_Resource, '/api/v1.0/cambiar_contrasena')
api.add_resource(UsuariosList_Resource, '/api/v1.0/list')