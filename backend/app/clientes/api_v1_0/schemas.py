from marshmallow import EXCLUDE, fields, pre_load, validate

from app.ext import ma


# ---------------------------------------------------------------------------
# Validacion de entrada
# Aqui va todo lo que valida el formato del dato (responde 400).
# ---------------------------------------------------------------------------
def _mensajes(campo):
    """Mensajes de error en español para un campo obligatorio."""
    return {
        'required': f'{campo} es requerido',
        'null':     f'{campo} es requerido',
        'invalid':  f'{campo} no es válido',
    }


def _texto(campo, largo):
    """Texto obligatorio (puede venir vacio) con el largo maximo de la columna."""
    return fields.Str(
        required=True,
        error_messages=_mensajes(campo),
        validate=validate.Length(
            max=largo,
            error=f'{campo} no puede superar {largo} caracteres'))


class ClienteSchema(ma.Schema):
    class Meta:
        unknown = EXCLUDE   # los campos que no conoce se ignoran, como antes

    id = fields.Int(dump_only=True)
    nombre = fields.Str(
        required=True,
        error_messages=_mensajes('nombre'),
        validate=validate.Length(
            min=1,
            max=100,
            error='El nombre debe tener entre 1 y 100 caracteres'))
    telefono = _texto('telefono', 20)
    direccion = _texto('direccion', 200)
    nit = _texto('nit', 20)
    correo = fields.Email(
        allow_none=True,
        error_messages={'invalid': 'correo no es válido'},
        validate=validate.Length(max=120, error='correo no puede superar 120 caracteres'))
    created_at = fields.DateTime(dump_only=True)

    @pre_load
    def limpiar_textos(self, data, **kwargs):
        """strip() a los textos; un correo vacio se guarda como null."""
        if not isinstance(data, dict):
            return data
        data = dict(data)
        for campo in ('nombre', 'telefono', 'direccion', 'nit', 'correo'):
            if isinstance(data.get(campo), str):
                data[campo] = data[campo].strip()
        if data.get('correo') == '':
            data['correo'] = None
        return data


class ClienteUpdateSchema(ClienteSchema):
    """PUT /clientes/<id>: se cargan con partial=True; el nit no se puede modificar."""
    class Meta:
        unknown = EXCLUDE
        exclude = ('nit',)