from marshmallow import EXCLUDE, ValidationError, fields, pre_load, validate, validates, validates_schema
from sqlalchemy import func

from app.ext import ma
from app.tamanos.api_v1_0.schemas import TamanoSchema
from app.tamanos.models import Tamano
from ..models import Categoria, ProductoTamano


def _limpiar(data, campos):
    """strip() a los campos de texto indicados antes de validar."""
    if not isinstance(data, dict):
        return data
    return {k: (v.strip() if k in campos and isinstance(v, str) else v)
            for k, v in data.items()}


def _categoria_existe(value):
    if not Categoria.query.get(value):
        raise ValidationError('La categoría no existe')


def _tamano_existe(value):
    if not Tamano.query.get(value):
        raise ValidationError('El tamaño no existe')


class CategoriaSchema(ma.Schema):
    id = fields.Int(dump_only=True)
    nombre = fields.Str(
        required=True,
        validate=validate.Length(min=1, max=50, error='El nombre debe tener entre 1 y 50 caracteres'))
    activo = fields.Bool()

    def __init__(self, *args, excluir_id=None, **kwargs):
        # excluir_id: al editar, la propia categoria no cuenta como nombre repetido
        super().__init__(*args, **kwargs)
        self.excluir_id = excluir_id

    @pre_load
    def limpiar(self, data, **kwargs):
        return _limpiar(data, ('nombre',))

    @validates('nombre')
    def validar_nombre_unico(self, value, **kwargs):
        query = Categoria.query.filter(func.lower(Categoria.nombre) == value.lower())
        if self.excluir_id:
            query = query.filter(Categoria.id != self.excluir_id)
        if query.first():
            raise ValidationError('Ya existe una categoría con ese nombre')


class ProductoSchema(ma.Schema):
    id = fields.Int(dump_only=True)
    nombre = fields.Str(
        required=True,
        validate=validate.Length(min=1, max=100, error='El nombre debe tener entre 1 y 100 caracteres'))
    descripcion = fields.Str(allow_none=True)
    precio_base = fields.Float(
        required=True,
        validate=validate.Range(min=0, error='El precio base no puede ser negativo'))
    activo = fields.Bool()
    categoria_id = fields.Int(required=True, validate=_categoria_existe)
    categoria = fields.Nested(CategoriaSchema, dump_only=True)
   # stock = fields.Integer()

    @pre_load
    def limpiar(self, data, **kwargs):
        return _limpiar(data, ('nombre',))


class ProductoTamanoSchema(ma.Schema):
    producto_id = fields.Int(required=True)
    tamano_id = fields.Int(required=True, validate=_tamano_existe)
    precio = fields.Float(
        required=True,
        validate=validate.Range(min=0, error='El precio no puede ser negativo'))

    tamano = fields.Nested(TamanoSchema, dump_only=True)

    @validates_schema
    def validar_no_repetido(self, data, **kwargs):
        if ProductoTamano.query.get((data['producto_id'], data['tamano_id'])):
            raise ValidationError('Ese tamaño ya está asignado al producto', field_name='tamano_id')


class StockSchema(ma.Schema):
    class Meta:
        unknown = EXCLUDE

    cantidad = fields.Int(
        strict=True,
        required=True,
        validate=validate.Range(min=1, error='La cantidad debe ser mayor a 0'),
        error_messages={'required': 'La cantidad debe ser mayor a 0',
                        'null': 'La cantidad debe ser mayor a 0',
                        'invalid': 'La cantidad debe ser un número entero'})