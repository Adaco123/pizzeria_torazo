from marshmallow import ValidationError, fields, pre_load, validate, validates
from sqlalchemy import func

from app.ext import ma
from app.tamanos.models import Tamano


class TamanoSchema(ma.Schema):
    id = fields.Int(dump_only=True)
    nombre = fields.Str(
        required=True,
        validate=validate.Length(
            min=1,
            max=50,
            error='El nombre debe tener entre 1 y 50 caracteres'))

    def __init__(self, *args, excluir_id=None, **kwargs):
        super().__init__(*args, **kwargs)
        self.excluir_id = excluir_id

    @pre_load
    def limpiar_nombre(self, data, **kwargs):
        if isinstance(data, dict) and isinstance(data.get('nombre'), str):
            data = {**data, 'nombre': data['nombre'].strip()}
        return data

    @validates('nombre')
    def validar_nombre_unico(self, value, **kwargs):
        query = Tamano.query.filter(func.lower(Tamano.nombre) == value.lower())
        if self.excluir_id:
            query = query.filter(Tamano.id != self.excluir_id)
        if query.first():
            raise ValidationError('Ya existe un tamaño con ese nombre')
