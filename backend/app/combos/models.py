from app.db import db, BaseModelMixin
class Combo(db.Model, BaseModelMixin):
    __tablename__ = "combos"

    id     = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(100), nullable=False)
    precio = db.Column(db.Float, nullable=False)
    activo = db.Column(db.Boolean, nullable=False, default=True)

    combo_productos = db.relationship("ComboProducto", back_populates="combo",
                                      cascade="all, delete-orphan")
    detalles_pedido = db.relationship("DetallePedido", back_populates="combo")

    def __init__(self, nombre, precio, activo=True):
        self.nombre = nombre
        self.precio = precio
        self.activo = activo

    def __repr__(self):
        return f"<Combo {self.nombre}>"


class ComboProducto(db.Model, BaseModelMixin):
    __tablename__ = "combo_producto"

    combo_id    = db.Column(db.Integer, db.ForeignKey("combos.id"),    primary_key=True)
    producto_id = db.Column(db.Integer, db.ForeignKey("productos.id"), primary_key=True)
    cantidad    = db.Column(db.Integer, nullable=False, default=1)

    combo    = db.relationship("Combo",    back_populates="combo_productos")
    producto = db.relationship("Producto", back_populates="combo_productos")

    def __init__(self, combo_id, producto_id, cantidad=1):
        self.combo_id    = combo_id
        self.producto_id = producto_id
        self.cantidad    = cantidad

    def __repr__(self):
        return f"<ComboProducto combo={self.combo_id} producto={self.producto_id}>"

