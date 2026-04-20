from flask import request, Blueprint
from flask_restful import Api, Resource
from marshmallow import ValidationError
from .schemas import (UsuariosSchema, RegistroSchema, LoginSchema,
                      UsuarioEditSchema, CambiarContrasenaSchema)
from app.db import db
from ..models import Usuario, Role, ROL_ADMINISTRADOR
from flask_jwt_extended import create_access_token, jwt_required, current_user
from werkzeug.security import generate_password_hash

usuarios_v1_0_bp = Blueprint('films_v1_0_bp', __name__)
usuarios_schema = UsuariosSchema()
registro_schema = RegistroSchema()
login_schema = LoginSchema()
usuario_edit_schema = UsuarioEditSchema()
cambiar_contrasena_schema = CambiarContrasenaSchema()
api = Api(usuarios_v1_0_bp)

# Roles base (el orden fija el id autoincremental: Administrador=1, Cajero=2, Pizzero=3)
ROLES_POR_DEFECTO = [ROL_ADMINISTRADOR, "Cajero", "Pizzero"]


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


class Registro_Resource(Resource):
    def post(self):
        try:
            _asegurar_roles_por_defecto()
            data, error = _cargar(registro_schema, request.get_json())
            if error:
                return error
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
        except Exception as e:
            return {'error': f'Error interno del servidor: {str(e)}'}, 500


class UsuarioEdit_Resource(Resource):
    @jwt_required()
    def put(self, usuario_id):
        try:
            user = Usuario.query.get_or_404(usuario_id)
            current_user_obj = current_user
            es_admin = bool(current_user_obj.rol and current_user_obj.rol.nombre == ROL_ADMINISTRADOR)

            if current_user_obj.id != user.id and not es_admin:
                return {'error': 'No tienes permisos para editar este usuario'}, 403

            data, error = _cargar(usuario_edit_schema, request.get_json())
            if error:
                return error

            # Solo admin puede cambiar activo
            if 'activo' in data and not es_admin:
                return {'error': 'Solo administradores pueden cambiar el estado activo'}, 403

            for campo, valor in data.items():   # nombre, rol_id, codigo, activo
                setattr(user, campo, valor)

            user.save()
            user_data = usuarios_schema.dump(user)
            return {'message': 'Usuario actualizado exitosamente', 'user': user_data}, 200
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
                return {'error': 'La contraseña actual es incorrecta'}, 401

            user.set_password(data['contra_nueva'])
            user.save()
            return {'message': 'Contraseña cambiada exitosamente'}, 200
        except Exception as e:
            return {'error': f'Error interno del servidor: {str(e)}'}, 500


class UsuariosList_Resource(Resource):
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
        except Exception as e:
            return {'error': f'Error interno del servidor: {str(e)}'}, 500

api.add_resource(Registro_Resource, '/api/v1.0/registrar/', '/Registro_Resource')
api.add_resource(Login_Resource, '/api/v1.0/login/', '/Login_Resource')
api.add_resource(Usuario_Resource, '/me')
api.add_resource(UsuarioEdit_Resource, '/api/v1.0/usuarios/<int:usuario_id>')
api.add_resource(CambiarContrasena_Resource, '/api/v1.0/cambiar_contrasena')
api.add_resource(UsuariosList_Resource, '/api/v1.0/list')