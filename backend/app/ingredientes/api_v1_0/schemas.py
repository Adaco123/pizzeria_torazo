from marshmallow import fields

from app.ext import ma


class IngredienteSchema(ma.Schema):
    id = fields.Int(dump_only=True)
    nombre = fields.Str(required=True)
    precio_extra = fields.Float()
    activo = fields.Bool()


class ProductoIngredienteSchema(ma.Schema):
    producto_id = fields.Int(required=True)
    ingrediente_id = fields.Int(required=True)
    # nested fields to show ingredient details
    ingrediente = fields.Nested(IngredienteSchema, dump_only=True)


class IngredienteTamanoSchema(ma.Schema):
    ingrediente_id = fields.Int(required=True)
    tamano_id = fields.Int(required=True)
    precio_extra = fields.Float(required=True)
