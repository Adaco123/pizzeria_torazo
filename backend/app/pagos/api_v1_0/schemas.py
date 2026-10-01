from marshmallow import EXCLUDE, ValidationError, fields, pre_load, validate, validates, validates_schema

from app.ext import ma
from app.pagos.models import MetodoPago


def _mensajes(campo):
    """Mensajes de error en español para un campo obligatorio."""
    requerido = f'{campo} es requerido'
    return {'required': requerido, 'null': requerido, 'invalid': f'{campo} no es válido'}


class MetodoPagoSchema(ma.Schema):
    class Meta:
        unknown = EXCLUDE

    id     = fields.Int(dump_only=True)
    nombre = fields.Str(
        required=True,
        error_messages=_mensajes('nombre'),
        validate=validate.Length(
            min=1,
            max=50,
            error='nombre debe tener entre 1 y 50 caracteres'))

    def __init__(self, *args, excluir_id=None, **kwargs):
        super().__init__(*args, **kwargs)
        self.excluir_id = excluir_id

    @pre_load
    def limpiar_nombre(self, data, **kwargs):
        if isinstance(data, dict) and isinstance(data.get('nombre'), str):
            data = {**data, 'nombre': data['nombre'].strip()}
        return data

    @validates('nombre')
    def validar_nombre_unico(self, value, **kwargs):
        query = MetodoPago.query.filter_by(nombre=value)
        if self.excluir_id:
            query = query.filter(MetodoPago.id != self.excluir_id)
        if query.first():
            raise ValidationError(f"Ya existe un método de pago con nombre '{value}'")


class PagoSchema(ma.Schema):
    class Meta:
        unknown = EXCLUDE

    id             = fields.Int(dump_only=True)
    factura_id     = fields.Int(required=True, error_messages=_mensajes('factura_id'))
    metodo_id      = fields.Int(required=True, error_messages=_mensajes('metodo_id'))
    monto          = fields.Float(required=True, error_messages=_mensajes('monto'))
    monto_recibido = fields.Float(load_default=None, allow_none=True,
                                  error_messages={'invalid': 'monto_recibido no es válido'})
    vuelto         = fields.Float(dump_only=True)
    fecha          = fields.DateTime(dump_only=True)
    usuario_id     = fields.Int(required=True, error_messages=_mensajes('usuario_id'))
    metodo         = fields.Nested(MetodoPagoSchema, dump_only=True)

    @validates_schema
    def validar_monto_recibido_efectivo(self, data, **kwargs):
        # Ojo: se compara metodo.nombre.lower() == 'efectivo' para pedir monto_recibido.
        # Si el método no existe no se valida acá: el resource responde 404.
        metodo = MetodoPago.query.get(data['metodo_id'])
        if not metodo or metodo.nombre.lower() != 'efectivo':
            return

        monto_recibido = data.get('monto_recibido')
        if monto_recibido is None:
            raise ValidationError('monto_recibido es requerido para efectivo',
                                  field_name='monto_recibido')
        if monto_recibido < data['monto']:
            raise ValidationError('monto_recibido no puede ser menor al monto',
                                  field_name='monto_recibido')