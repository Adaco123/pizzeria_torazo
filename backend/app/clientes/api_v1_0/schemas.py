from marshmallow import fields

from app.ext import ma


class ClienteSchema(ma.Schema):
    id = fields.Int(dump_only=True)
    nombre = fields.Str(required=True)
    telefono = fields.Str(required=True)
    direccion = fields.Str(required=True)
    nit=fields.Str(required=True)
    correo = fields.Email(allow_none=True)
    created_at = fields.DateTime(dump_only=True)  

