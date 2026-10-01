from marshmallow import fields, pre_load, validate

from app.ext import ma


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


class IngredienteSchema(ma.Schema):
    id = fields.Int(dump_only=True)
    nombre = fields.Str(
        required=True,
        error_messages=_mensajes('nombre'),
        validate=validate.Length(
            min=1,
            max=100,
            error='El nombre debe tener entre 1 y 100 caracteres'))
    precio_extra = fields.Float(error_messages={
        'invalid': 'precio_extra no es válido',
        'null':    'precio_extra no puede ser nulo'})
    activo = fields.Bool(error_messages={
        'invalid': 'activo debe ser true o false',
        'null':    'activo no puede ser nulo'})

    @pre_load
    def limpiar_nombre(self, data, **kwargs):
        if isinstance(data, dict) and isinstance(data.get('nombre'), str):
            data = {**data, 'nombre': data['nombre'].strip()}
        return data


class ProductoIngredienteSchema(ma.Schema):
    producto_id = _id_positivo('producto_id')
    ingrediente_id = _id_positivo('ingrediente_id')
    # nested fields to show ingredient details
    ingrediente = fields.Nested(IngredienteSchema, dump_only=True)


class IngredienteTamanoSchema(ma.Schema):
    ingrediente_id = _id_positivo('ingrediente_id')
    tamano_id = _id_positivo('tamano_id')
    precio_extra = fields.Float(
        required=True,
        error_messages=_mensajes('precio_extra'))