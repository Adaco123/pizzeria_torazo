from app.ext import ma
from marshmallow import fields, validate
class MovimientoStockSchema(ma.Schema):
    id             = fields.Int(dump_only=True)
    producto_id    = fields.Int(required=True)
    producto_nombre = fields.Str(dump_only=True)
    usuario_id     = fields.Int(dump_only=True)   
    usuario_nombre = fields.Str(dump_only=True)
    turno_id       = fields.Int(dump_only=True) 
    cantidad       = fields.Int(
        required=True,
        validate=validate.Range(min=1, error='La cantidad debe ser mayor a 0')
    )
    stock_anterior = fields.Int(dump_only=True)
    stock_nuevo    = fields.Int(dump_only=True)
    fecha          = fields.DateTime(dump_only=True)


movimiento_stock_schema  = MovimientoStockSchema()
movimientos_stock_schema = MovimientoStockSchema(many=True)