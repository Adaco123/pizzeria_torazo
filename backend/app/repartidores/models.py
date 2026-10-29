from app.db import db, BaseModelMixin

TIPOS_REPARTIDOR = ('persona', 'empresa')


class Repartidor(db.Model, BaseModelMixin):
    """Quien lleva los pedidos a domicilio: una persona o una empresa de delivery."""
    __tablename__ = "repartidores"

    id       = db.Column(db.Integer, primary_key=True)
    nombre   = db.Column(db.String(80), nullable=False, unique=True)
    tipo     = db.Column(db.String(20), nullable=False, default='persona', server_default='persona')
    telefono = db.Column(db.String(30), nullable=True)
    activo   = db.Column(db.Boolean, nullable=False, default=True, server_default=db.true())

    def __init__(self, nombre, tipo='persona', telefono=None, activo=True):
        self.nombre   = nombre
        self.tipo     = tipo
        self.telefono = telefono
        self.activo   = activo

    def __repr__(self):
        return f"<Repartidor {self.nombre}>"
