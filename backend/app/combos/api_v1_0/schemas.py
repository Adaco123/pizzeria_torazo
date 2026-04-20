from marshmallow import fields

from app.ext import ma
from app.productos.api_v1_0.schemas import ProductoSchema


class ComboSchema(ma.Schema):
    id = fields.Int(dump_only=True)
    nombre = fields.Str(required=True)
    precio = fields.Float(required=True)
    activo = fields.Bool()


class ComboProductoSchema(ma.Schema):
    combo_id = fields.Int(required=True)
    producto_id = fields.Int(required=True)
    cantidad = fields.Int(required=True)

    producto = fields.Nested(ProductoSchema, dump_only=True)
