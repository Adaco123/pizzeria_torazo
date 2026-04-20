from marshmallow import fields, validate

from app.ext import ma

class MetodoPagoSchema(ma.Schema):
    id     = fields.Int(dump_only=True)
    nombre = fields.Str(required=True, validate=validate.Length(min=1, max=50))

class PagoSchema(ma.Schema):
    id             = fields.Int(dump_only=True)
    factura_id     = fields.Int(required=True)
    metodo_id      = fields.Int(required=True)
    monto          = fields.Float(required=True)
    monto_recibido = fields.Float(load_default=None)
    vuelto         = fields.Float(dump_only=True)
    fecha          = fields.DateTime(dump_only=True)
    usuario_id     = fields.Int(required=True)
    metodo         = fields.Nested(MetodoPagoSchema, dump_only=True)