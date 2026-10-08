from marshmallow import EXCLUDE, ValidationError, fields, validate, validates, validates_schema
from app.ext import ma


def _id_positivo():
    return fields.Int(strict=True, validate=validate.Range(min=1, error='Debe ser un ID mayor a 0'))


class DetalleExtrasSchema(ma.Schema):
    class Meta:
        unknown = EXCLUDE

    id             = fields.Int(dump_only=True)
    detalle_id     = fields.Int(dump_only=True)
    ingrediente_id = _id_positivo()
    tamano_id      = fields.Int(dump_only=True)
    precio_extra   = fields.Float(dump_only=True)
    cantidad       = fields.Int(strict=True, load_default=1,
                                validate=validate.Range(min=1, error='La cantidad debe ser mayor a 0'))
    ingrediente    = fields.Method("get_ingrediente", dump_only=True)

    def get_ingrediente(self, obj):
        return {"id": obj.ingrediente.id, "nombre": obj.ingrediente.nombre} \
               if obj.ingrediente else None

class DetalleMitadExtraSchema(ma.Schema):
    class Meta:
        unknown = EXCLUDE

    id               = fields.Int(dump_only=True)
    detalle_mitad_id = fields.Int(dump_only=True)
    ingrediente_id   = _id_positivo()
    cantidad         = fields.Int(strict=True, load_default=1,
                                  validate=validate.Range(min=1, error='La cantidad debe ser mayor a 0'))
    ingrediente      = fields.Method("get_ingrediente", dump_only=True)

    def get_ingrediente(self, obj):
        return {"id": obj.ingrediente.id, "nombre": obj.ingrediente.nombre} \
               if obj.ingrediente else None

class DetalleMitadSchema(ma.Schema):
    class Meta:
        unknown = EXCLUDE

    id          = fields.Int(dump_only=True)
    detalle_id  = fields.Int(dump_only=True)
    mitad       = fields.Int(strict=True, required=True,
                             validate=validate.OneOf([1, 2], error='mitad debe ser 1 o 2'))
    producto_id = _id_positivo()
    producto    = fields.Method("get_producto", dump_only=True)
    extras      = fields.List(fields.Nested(DetalleMitadExtraSchema), load_default=list)

    def get_producto(self, obj):
        return {"id": obj.producto.id, "nombre": obj.producto.nombre} \
               if obj.producto else None


class DetallePedidoSchema(ma.Schema):
    class Meta:
        unknown = EXCLUDE

    id              = fields.Int(dump_only=True)
    pedido_id       = fields.Int(dump_only=True)
    producto_id     = fields.Int(strict=True, allow_none=True, validate=validate.Range(min=1))
    combo_id        = fields.Int(strict=True, allow_none=True, validate=validate.Range(min=1))
    tamano_id       = fields.Int(strict=True, allow_none=True, validate=validate.Range(min=1))
    cantidad        = fields.Int(strict=True, required=True,
                                 validate=validate.Range(min=1, error='La cantidad debe ser mayor a 0'))
    precio_unitario = fields.Float(validate=validate.Range(min=0, error='El precio no puede ser negativo'))
    subtotal        = fields.Float(dump_only=True)
    is_mitad        = fields.Bool(dump_only=True)
    notas           = fields.Str(allow_none=True)
    extras          = fields.List(fields.Nested(DetalleExtrasSchema),   dump_only=True)
    mitades         = fields.List(fields.Nested(DetalleMitadSchema),    dump_only=True)

    producto_nombre = fields.Method("get_producto_nombre", dump_only=True)
    tamano_nombre   = fields.Method("get_tamano_nombre",   dump_only=True)

    def get_producto_nombre(self, obj):
        """Si es mitad/mitad devuelve 'Charque / Hawaiana', si no el nombre normal."""
        if obj.is_mitad and obj.mitades:
            nombres = [m.producto.nombre for m in obj.mitades if m.producto]
            return " / ".join(nombres)
        return obj.producto.nombre if obj.producto else None

    def get_tamano_nombre(self, obj):
        return obj.tamano.nombre if obj.tamano else None

    @validates_schema
    def validar_producto_o_combo(self, data, **kwargs):
        if (data.get('producto_id') is None) == (data.get('combo_id') is None):
            raise ValidationError('Debe especificar producto_id o combo_id, pero no ambos')


class DetalleMitadPedidoSchema(ma.Schema):
    class Meta:
        unknown = EXCLUDE

    tamano_id = _id_positivo()
    cantidad = fields.Int(strict=True, load_default=1,
                           validate=validate.Range(min=1, error='La cantidad debe ser mayor a 0'))
    notas = fields.Str(allow_none=True)
    mitades = fields.List(
        fields.Nested(DetalleMitadSchema),
        required=True,
        validate=validate.Length(equal=2, error='Debe enviar exactamente 2 mitades'))

    @validates_schema
    def validar_mitades_distintas(self, data, **kwargs):
        if {mitad['mitad'] for mitad in data['mitades']} != {1, 2}:
            raise ValidationError('Debe enviar una mitad 1 y una mitad 2', field_name='mitades')

class PedidoSchema(ma.Schema):
    class Meta:
        unknown = EXCLUDE

    id                = fields.Int(dump_only=True)
    numero_turno      = fields.Int(dump_only=True)
    fecha             = fields.DateTime(dump_only=True)
    updated_at        = fields.DateTime(dump_only=True)
    estado_id         = fields.Int(dump_only=True)
    tipo_entrega_id   = _id_positivo()
    direccion_entrega = fields.Str(allow_none=True, validate=validate.Length(max=200))
    total             = fields.Float(dump_only=True)
    pagado            = fields.Float(dump_only=True)
    motivo_cancelacion = fields.Str(dump_only=True, allow_none=True)
    cliente_id        = _id_positivo()
    usuario_id        = _id_positivo()
    turno_id          = _id_positivo()
    detalles          = fields.List(fields.Nested(DetallePedidoSchema), dump_only=True)

    estado       = fields.Method("get_estado",       dump_only=True)
    tipo_entrega = fields.Method("get_tipo_entrega", dump_only=True)

    def get_estado(self, obj):
        return {"id": obj.estado.id, "nombre": obj.estado.nombre} \
               if obj.estado else None

    def get_tipo_entrega(self, obj):
        return {"id": obj.tipo_entrega.id, "nombre": obj.tipo_entrega.nombre} \
               if obj.tipo_entrega else None

    @validates('tipo_entrega_id')
    def validate_tipo_entrega_id(self, value, **kwargs):
        from app.pedidos.models import TipoEntrega
        if not TipoEntrega.query.get(value):
            raise ValidationError(f"tipo_entrega_id {value} no existe")


class PedidoUpdateSchema(ma.Schema):
    class Meta:
        unknown = EXCLUDE

    estado_id = fields.Int(strict=True, validate=validate.Range(min=1))
    tipo_entrega_id = fields.Int(strict=True, validate=validate.Range(min=1))
    direccion_entrega = fields.Str(allow_none=True, validate=validate.Length(max=200))

    @validates('estado_id')
    def validar_estado_id(self, value, **kwargs):
        from app.pedidos.models import EstadoPedido
        if not EstadoPedido.query.get(value):
            raise ValidationError(f'estado_id {value} no existe')

    @validates('tipo_entrega_id')
    def validar_tipo_entrega_id(self, value, **kwargs):
        from app.pedidos.models import TipoEntrega
        if not TipoEntrega.query.get(value):
            raise ValidationError(f'tipo_entrega_id {value} no existe')


class PedidoEstadoSchema(ma.Schema):
    class Meta:
        unknown = EXCLUDE

    estado = fields.Str(required=True, validate=validate.OneOf([
        'pendiente', 'confirmado', 'en_preparacion', 'listo', 'entregado', 'cancelado'
    ], error='Estado de pedido inválido'))


class PagoCobroSchema(ma.Schema):
    """Un pago dentro de POST /pedidos/<id>/cobrar."""
    class Meta:
        unknown = EXCLUDE

    metodo_id      = fields.Int(strict=True, required=True,
                                validate=validate.Range(min=1, error='Debe ser un ID mayor a 0'),
                                error_messages={'required': 'metodo_id es requerido'})
    monto          = fields.Float(required=True,
                                  validate=validate.Range(min=0, min_inclusive=False,
                                                          error='El monto debe ser mayor a 0'),
                                  error_messages={'required': 'monto es requerido',
                                                  'invalid': 'monto no es válido'})
    monto_recibido = fields.Float(load_default=None, allow_none=True,
                                  error_messages={'invalid': 'monto_recibido no es válido'})


class CobrarSchema(ma.Schema):
    class Meta:
        unknown = EXCLUDE

    pagos = fields.List(
        fields.Nested(PagoCobroSchema),
        required=True,
        validate=validate.Length(min=1, error='Registra al menos un pago'),
        error_messages={'required': 'pagos es requerido'})
