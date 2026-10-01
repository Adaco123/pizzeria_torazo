from marshmallow import EXCLUDE, fields, validate

from app.ext import ma


def _mensajes(campo, requerido='requerido'):
    """Mensajes de error en español para un campo obligatorio."""
    return {
        'required': f'{campo} es {requerido}',
        'null':     f'{campo} es {requerido}',
        'invalid':  f'{campo} no es válido',
    }


def _limit(por_defecto):
    """Query param ?limit=: entero positivo, con valor por defecto."""
    return fields.Int(
        load_default=por_defecto,
        error_messages={'invalid': 'limit no es válido'},
        validate=validate.Range(min=1, error='limit debe ser mayor a 0'))


class MovimientoStockSchema(ma.Schema):
    id             = fields.Int(dump_only=True)
    producto_id    = fields.Int(
        required=True,
        error_messages=_mensajes('producto_id'),
        validate=validate.Range(min=1, error='producto_id no es válido')
    )
    producto_nombre = fields.Str(dump_only=True)
    usuario_id     = fields.Int(dump_only=True)
    usuario_nombre = fields.Str(dump_only=True)
    turno_id       = fields.Int(dump_only=True)
    cantidad       = fields.Int(
        required=True,
        error_messages=_mensajes('cantidad', 'requerida'),
        validate=validate.Range(min=1, error='La cantidad debe ser mayor a 0')
    )
    stock_anterior = fields.Int(dump_only=True)
    stock_nuevo    = fields.Int(dump_only=True)
    fecha          = fields.DateTime(dump_only=True)


class MovimientoStockListQuerySchema(ma.Schema):
    """Query params de GET /api/stock/movimientos: ?producto_id=X&limit=N"""
    class Meta:
        unknown = EXCLUDE

    producto_id = fields.Int(
        error_messages={'invalid': 'producto_id no es válido'},
        validate=validate.Range(min=1, error='producto_id no es válido'))
    limit = _limit(50)


class MovimientoStockProductoQuerySchema(ma.Schema):
    """Query params de GET /api/stock/movimientos/<producto_id>: ?limit=N"""
    class Meta:
        unknown = EXCLUDE

    limit = _limit(10)


movimiento_stock_schema  = MovimientoStockSchema()
movimientos_stock_schema = MovimientoStockSchema(many=True)
list_query_schema        = MovimientoStockListQuerySchema()
producto_query_schema    = MovimientoStockProductoQuerySchema()