from datetime import datetime
from app.db import db, BaseModelMixin
class Categoria(db.Model, BaseModelMixin):
    __tablename__ = "categorias"

    id     = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(50), nullable=False, unique=True)
    activo = db.Column(db.Boolean, nullable=False, default=True)

    productos = db.relationship("Producto", back_populates="categoria")

    def __init__(self, nombre, activo=True):
        self.nombre = nombre
        self.activo = activo

    def __repr__(self):
        return f"<Categoria {self.nombre}>"
    
class Producto(db.Model, BaseModelMixin):
    __tablename__ = "productos"

    id           = db.Column(db.Integer, primary_key=True)
    nombre       = db.Column(db.String(100), nullable=False)
    descripcion  = db.Column(db.Text, nullable=True)
    precio_base  = db.Column(db.Float, nullable=False)
    activo       = db.Column(db.Boolean, nullable=False, default=True)
    categoria_id = db.Column(db.Integer, db.ForeignKey("categorias.id"), nullable=False)
    created_at   = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at   = db.Column(db.DateTime, nullable=False, default=datetime.utcnow,
                             onupdate=datetime.utcnow)

    stock = db.Column(db.Integer, nullable=True, default=None)
    
    categoria             = db.relationship("Categoria", back_populates="productos")
    producto_tamanos      = db.relationship("ProductoTamano", back_populates="producto",
                                            cascade="all, delete-orphan")
    producto_ingredientes = db.relationship("ProductoIngrediente", back_populates="producto",
                                            cascade="all, delete-orphan")
    combo_productos       = db.relationship("ComboProducto", back_populates="producto")
    detalles_pedido       = db.relationship("DetallePedido", back_populates="producto")

    def __init__(self, nombre, precio_base, categoria_id,
                 descripcion=None, activo=True):
        self.nombre       = nombre
        self.precio_base  = precio_base
        self.categoria_id = categoria_id
        self.descripcion  = descripcion
        self.activo       = activo

    def __repr__(self):
        return f"<Producto {self.nombre}>"
    
    @staticmethod
    def obtener_menu():
        return (
            db.session.query(Producto, ProductoTamano)
            .join(ProductoTamano)
            .join(Categoria)
            .filter(Categoria.nombre == "pizzas")
            .all()
        )

class ProductoTamano(db.Model, BaseModelMixin):
    __tablename__ = "producto_tamano"

    producto_id = db.Column(db.Integer, db.ForeignKey("productos.id"), primary_key=True)
    tamano_id   = db.Column(db.Integer, db.ForeignKey("tamanos.id"),   primary_key=True)
    precio      = db.Column(db.Float, nullable=False)

    producto = db.relationship("Producto", back_populates="producto_tamanos")
    tamano   = db.relationship("Tamano",   back_populates="producto_tamanos")

    def __init__(self, producto_id, tamano_id, precio):
        self.producto_id = producto_id
        self.tamano_id   = tamano_id
        self.precio      = precio

    def __repr__(self):
        return f"<ProductoTamano producto={self.producto_id} tamano={self.tamano_id}>"

