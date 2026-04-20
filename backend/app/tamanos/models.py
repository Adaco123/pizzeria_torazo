from app.db import db, BaseModelMixin

class Tamano(db.Model, BaseModelMixin):
    __tablename__ = "tamanos"

    id     = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(50), nullable=False, unique=True)

    producto_tamanos    = db.relationship("ProductoTamano",    back_populates="tamano")
    precios_ingrediente = db.relationship("IngredienteTamano", back_populates="tamano") 

    def __init__(self, nombre):
        self.nombre = nombre

    def __repr__(self):
        return f"<Tamano {self.nombre}>"
