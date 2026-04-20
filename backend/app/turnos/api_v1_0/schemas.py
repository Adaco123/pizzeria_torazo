from marshmallow import EXCLUDE, fields, Schema, validate
from app.ext import ma

class TurnoSchema(ma.Schema):
    class Meta:
        unknown = EXCLUDE

    id = fields.Int(dump_only=True)
    usuario_id = fields.Int(required=True, validate=validate.Range(min=1, error='usuario_id debe ser mayor a 0'))

    apertura = fields.DateTime(dump_only=True)
    cierre = fields.DateTime(allow_none=True)

    monto_inicio = fields.Float(
        load_default=0,
        validate=validate.Range(min=0, error='monto_inicio no puede ser negativo'))
    monto_cierre = fields.Float(
        allow_none=True,
        validate=validate.Range(min=0, error='monto_cierre no puede ser negativo'))

    abierto = fields.Boolean(dump_only=True)