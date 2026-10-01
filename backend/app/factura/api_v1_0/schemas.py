from marshmallow import fields, pre_load, validate, validates, validates_schema, ValidationError
from app.ext import ma


# ---------------------------------------------------------------------------
# Validacion de entrada
# Aqui va todo lo que valida el formato o la existencia del dato (responde 400).
# Se queda en el resource: el conflicto de numero_factura repetido (409).
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


def _monto_opcional(campo, **kwargs):
    return fields.Float(
        error_messages={
            'invalid': f'{campo} no es válido',
            'null':    f'{campo} no puede ser nulo',
        },
        **kwargs)


class FacturaSchema(ma.Schema):
    id             = fields.Int(dump_only=True)
    numero_factura = fields.Str(
        required=True,
        error_messages=_mensajes('numero_factura'),
        validate=validate.Length(
            min=1,
            max=20,
            error='numero_factura debe tener entre 1 y 20 caracteres'))
    pedido_id      = _id_positivo('pedido_id')
    cliente_id     = _id_positivo('cliente_id')
    usuario_id     = _id_positivo('usuario_id')

    fecha    = fields.DateTime(dump_only=True)
    # subtotal null en un POST = "calcularlo desde el pedido"
    subtotal = fields.Float(allow_none=True, error_messages={'invalid': 'subtotal no es válido'})
    descuento = _monto_opcional('descuento', load_default=0)
    impuesto  = _monto_opcional('impuesto',  load_default=0)
    total     = fields.Float(dump_only=True)
    anulada   = fields.Boolean(dump_only=True)

    cliente     = fields.Method('get_cliente',     dump_only=True)
    usuario     = fields.Method('get_usuario',     dump_only=True)
    pedido      = fields.Method('get_pedido',      dump_only=True)
    metodo_pago = fields.Method('get_metodo_pago', dump_only=True)

    def get_cliente(self, obj):
        if obj.cliente:
            return {'id': obj.cliente.id, 'nombre': obj.cliente.nombre}
        return None

    def get_usuario(self, obj):
        if obj.usuario:
            return {'id': obj.usuario.id, 'nombre': obj.usuario.nombre}
        return None

    def get_pedido(self, obj):
        if obj.pedido:
            return {'id': obj.pedido.id, 'total': obj.pedido.total}
        return None

    def get_metodo_pago(self, obj):

        try:
            if hasattr(obj, 'pagos') and obj.pagos:
                pago = obj.pagos[0]
                if pago and pago.metodo and hasattr(pago.metodo, 'nombre'):
                    return pago.metodo.nombre
        except Exception:
            pass
        return None


    @pre_load
    def limpiar_numero_factura(self, data, **kwargs):
        if isinstance(data, dict) and isinstance(data.get('numero_factura'), str):
            data = {**data, 'numero_factura': data['numero_factura'].strip()}
        return data

    @validates_schema
    def validar_subtotal_en_actualizacion(self, data, partial=None, **kwargs):
        # En un PUT (partial) subtotal no puede ser null: no hay pedido del que calcularlo.
        if partial and 'subtotal' in data and data['subtotal'] is None:
            raise ValidationError('subtotal no puede ser nulo', field_name='subtotal')

    @validates('pedido_id')
    def validate_pedido_id(self, value, **kwargs):
        from app.pedidos.models import Pedido
        if not Pedido.query.get(value):
            raise ValidationError(f"pedido_id {value} no existe")

    @validates('cliente_id')
    def validate_cliente_id(self, value, **kwargs):
        from app.clientes.models import Cliente
        if not Cliente.query.get(value):
            raise ValidationError(f"cliente_id {value} no existe")

    @validates('usuario_id')
    def validate_usuario_id(self, value, **kwargs):
        from app.users.models import Usuario
        if not Usuario.query.get(value):
            raise ValidationError(f"usuario_id {value} no existe")