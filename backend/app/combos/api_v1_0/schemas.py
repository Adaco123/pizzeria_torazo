from marshmallow import EXCLUDE, fields, pre_load, validate

from app.ext import ma
from app.productos.api_v1_0.schemas import ProductoSchema


# ---------------------------------------------------------------------------
# Validacion de entrada
# Aqui va todo lo que valida el formato del dato (responde 400).
# ---------------------------------------------------------------------------
def _mensajes(campo, requerido='requerido'):
    """Mensajes de error en español para un campo obligatorio."""
    return {
        'required': f'{campo} es {requerido}',
        'null':     f'{campo} es {requerido}',
        'invalid':  f'{campo} no es válido',
    }


def _id_positivo(campo):
    """Id de otra tabla: obligatorio y entero positivo."""
    return fields.Int(
        required=True,
        error_messages=_mensajes(campo),
        validate=validate.Range(min=1, error=f'{campo} no es válido'))


def _cantidad(**kwargs):
    return fields.Int(
        error_messages=_mensajes('cantidad', 'requerida'),
        validate=validate.Range(min=1, error='La cantidad debe ser mayor a 0'),
        **kwargs)


def _precio(**kwargs):
    return fields.Float(
        error_messages={
            'required': 'precio es requerido',
            'null':     'precio es requerido',
            'invalid':  'precio no es válido',
        },
        **kwargs)


def _activo():
    return fields.Bool(error_messages={
        'invalid': 'activo debe ser true o false',
        'null':    'activo no puede ser nulo',
    })


class ComboSchema(ma.Schema):
    id = fields.Int(dump_only=True)
    nombre = fields.Str(
        required=True,
        error_messages=_mensajes('nombre'),
        validate=validate.Length(
            min=1,
            max=100,
            error='El nombre debe tener entre 1 y 100 caracteres'))
    precio = _precio(required=True)
    activo = _activo()

    @pre_load
    def limpiar_nombre(self, data, **kwargs):
        if isinstance(data, dict) and isinstance(data.get('nombre'), str):
            data = {**data, 'nombre': data['nombre'].strip()}
        return data


class ComboUpdateSchema(ma.Schema):
    """PUT /combos/<id>: solo se pueden cambiar precio y activo (lo demas se ignora)."""
    class Meta:
        unknown = EXCLUDE

    precio = _precio()
    activo = _activo()


class ComboProductoSchema(ma.Schema):
    combo_id = _id_positivo('combo_id')
    producto_id = _id_positivo('producto_id')
    cantidad = _cantidad(required=True)

    producto = fields.Nested(ProductoSchema, dump_only=True)


class ComboProductoUpdateSchema(ma.Schema):
    """PUT /combos/<id>/productos/<id>: solo cantidad (lo demas se ignora)."""
    class Meta:
        unknown = EXCLUDE

    cantidad = _cantidad()