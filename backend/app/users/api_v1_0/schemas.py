from marshmallow import EXCLUDE, ValidationError, fields, pre_load, validate, validates

from app.ext import ma
from ..models import Role


class UsuariosSchema(ma.Schema):
    id = fields.Int()
    nombre = fields.Str(required=True)
    correo = fields.Email(required=True)
    rol = fields.Str()
    active = fields.Boolean()
    cedula = fields.Str()
    codigo = fields.Str(allow_none=True)
    created_at = fields.DateTime(dump_only=True)


# ---------------------------------------------------------------------------
# Validacion de entrada
# Aqui va todo lo que valida el formato o la existencia del dato (responde 400).
# Se quedan en el resource: conflictos de estado (correo ya usado, 409),
# permisos (403) y credenciales (401).
# ---------------------------------------------------------------------------
REGEX_NOMBRE = r'^[A-Za-z\s]+$'
REGEX_CODIGO = r'^[0-9]{5,10}$'


def _limpiar(data, campos):
    """strip() a los campos de texto indicados antes de validar."""
    if not isinstance(data, dict):
        return data
    return {k: (v.strip() if k in campos and isinstance(v, str) else v)
            for k, v in data.items()}


def _no_vacio(mensaje):
    def validar(valor):
        if not isinstance(valor, str) or valor.strip() == '':
            raise ValidationError(mensaje)
    return validar


def _rol_existe(value):
    if not Role.query.get(value):
        raise ValidationError('Rol no encontrado')


class RegistroSchema(ma.Schema):
    class Meta:
        unknown = EXCLUDE

    nombre = fields.Str(
        required=True,
        validate=validate.Regexp(REGEX_NOMBRE, error='El nombre completo debe contener solo letras'),
        error_messages={'required': 'Faltan Datos'})
    correo = fields.Str(required=True, error_messages={'required': 'Faltan Datos'})
    contra = fields.Str(
        required=True,
        validate=_no_vacio('La contraseña es requerida y no puede estar vacía'),
        error_messages={'required': 'Faltan Datos',
                        'null': 'La contraseña es requerida y no puede estar vacía',
                        'invalid': 'La contraseña es requerida y no puede estar vacía'})
    codigo = fields.Str(
        required=True,
        validate=validate.Regexp(REGEX_CODIGO, error='Codigo debe contener solo numeros menor a 10 digitos y mayor a 4'),
        error_messages={'required': 'Faltan Datos'})
    cedula = fields.Str(required=True, error_messages={'required': 'Faltan Datos'})
    rol_id = fields.Int(required=True, validate=_rol_existe,
                        error_messages={'required': 'Faltan Datos'})

    @pre_load
    def limpiar(self, data, **kwargs):
        return _limpiar(data, ('nombre', 'correo', 'codigo', 'cedula'))


class LoginSchema(ma.Schema):
    class Meta:
        unknown = EXCLUDE

    correo = fields.Str(required=True, error_messages={'required': 'Faltan datos '})
    contra = fields.Str(required=True, error_messages={'required': 'Faltan datos '})

    @pre_load
    def limpiar(self, data, **kwargs):
        return _limpiar(data, ('correo',))


class UsuarioEditSchema(ma.Schema):
    """Todos los campos son opcionales: solo se validan los que vienen."""
    class Meta:
        unknown = EXCLUDE

    nombre = fields.Str(
        validate=validate.Regexp(REGEX_NOMBRE, error='El nombre completo debe contener solo letras'))
    rol_id = fields.Int(validate=_rol_existe)
    codigo = fields.Str(
        validate=validate.Regexp(REGEX_CODIGO, error='Código debe contener solo números, menor a 10 dígitos y mayor a 4'))
    activo = fields.Raw(error_messages={'null': 'activo debe ser true o false'})

    @pre_load
    def limpiar(self, data, **kwargs):
        return _limpiar(data, ('nombre', 'codigo'))

    @validates('activo')
    def validar_activo(self, value, **kwargs):
        if not isinstance(value, bool):
            raise ValidationError('activo debe ser true o false')


class CambiarContrasenaSchema(ma.Schema):
    class Meta:
        unknown = EXCLUDE

    contra_actual = fields.Str(
        required=True,
        error_messages={'required': 'Faltan datos: contra_actual y contra_nueva'})
    contra_nueva = fields.Str(
        required=True,
        validate=_no_vacio('La nueva contraseña no puede estar vacía'),
        error_messages={'required': 'Faltan datos: contra_actual y contra_nueva',
                        'null': 'La nueva contraseña no puede estar vacía',
                        'invalid': 'La nueva contraseña no puede estar vacía'})