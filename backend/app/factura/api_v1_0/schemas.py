from marshmallow import fields, validates, ValidationError
from app.ext import ma


class FacturaSchema(ma.Schema):
    id             = fields.Int(dump_only=True)
    numero_factura = fields.Str(required=True)
    pedido_id      = fields.Int(required=True)
    cliente_id     = fields.Int(required=True)
    usuario_id     = fields.Int(required=True)

    fecha    = fields.DateTime(dump_only=True)
    subtotal = fields.Float(allow_none=True)
    descuento = fields.Float(load_default=0)
    impuesto  = fields.Float(load_default=0)
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