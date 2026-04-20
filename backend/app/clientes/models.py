from datetime import datetime
from app.db import db, BaseModelMixin
class Cliente(db.Model, BaseModelMixin):
    __tablename__ = "clientes"

    id         = db.Column(db.Integer, primary_key=True)
    nombre     = db.Column(db.String(100), nullable=False)
    telefono   = db.Column(db.String(20), nullable=True)
    direccion  = db.Column(db.String(200), nullable=True)
    correo     = db.Column(db.String(120), nullable=True)
    nit        = db.Column(db.String(20), nullable=True)
    activo     = db.Column(db.Boolean, nullable=False, default=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow,
                           onupdate=datetime.utcnow)

    pedidos  = db.relationship("Pedido", back_populates="cliente")
    facturas = db.relationship("Factura", back_populates="cliente")

    def __init__(self, nombre, telefono=None, direccion=None,
                 correo=None, nit=None, activo=True):
        self.nombre    = nombre
        self.telefono  = telefono
        self.direccion = direccion
        self.correo    = correo
        self.nit       = nit
        self.activo    = activo

    def __repr__(self):
        return f"<Cliente {self.nombre}>"