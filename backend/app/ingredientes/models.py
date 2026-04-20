from app.db import db, BaseModelMixin
class Ingrediente(db.Model, BaseModelMixin):
    __tablename__ = "ingredientes"

    id           = db.Column(db.Integer, primary_key=True)
    nombre       = db.Column(db.String(100), nullable=False)
    precio_extra = db.Column(db.Float, nullable=False, default=0)
    activo       = db.Column(db.Boolean, nullable=False, default=True)

    producto_ingredientes = db.relationship("ProductoIngrediente", back_populates="ingrediente")
    detalle_extras        = db.relationship("DetalleExtra", back_populates="ingrediente")
    precios_tamano        = db.relationship("IngredienteTamano", back_populates="ingrediente") 
    def __init__(self, nombre, precio_extra=0, activo=True):
        self.nombre       = nombre
        self.precio_extra = precio_extra
        self.activo       = activo

    def __repr__(self):
        return f"<Ingrediente {self.nombre}>"
class IngredienteTamano(db.Model, BaseModelMixin):
    __tablename__ = 'ingrediente_tamano'

    ingrediente_id = db.Column(db.Integer, db.ForeignKey('ingredientes.id'), primary_key=True, nullable=False)
    tamano_id      = db.Column(db.Integer, db.ForeignKey('tamanos.id'),      primary_key=True, nullable=False)
    precio_extra   = db.Column(db.Float, nullable=False)

    ingrediente = db.relationship('Ingrediente', back_populates='precios_tamano')
    tamano      = db.relationship('Tamano',      back_populates='precios_ingrediente')

class ProductoIngrediente(db.Model, BaseModelMixin):
    __tablename__ = "producto_ingrediente"

    producto_id    = db.Column(db.Integer, db.ForeignKey("productos.id"),    primary_key=True)
    ingrediente_id = db.Column(db.Integer, db.ForeignKey("ingredientes.id"), primary_key=True)

    producto    = db.relationship("Producto",    back_populates="producto_ingredientes")
    ingrediente = db.relationship("Ingrediente", back_populates="producto_ingredientes")

    def __init__(self, producto_id, ingrediente_id):
        self.producto_id    = producto_id
        self.ingrediente_id = ingrediente_id

    def __repr__(self):
        return f"<ProductoIngrediente producto={self.producto_id} ing={self.ingrediente_id}>"

