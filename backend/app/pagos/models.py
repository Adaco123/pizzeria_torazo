from app.db import db, BaseModelMixin
from datetime import datetime
class MetodoPago(db.Model, BaseModelMixin):
    __tablename__ = "metodos_pago"

    id     = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(50), nullable=False, unique=True)

    pagos = db.relationship("Pago", back_populates="metodo")

    def __init__(self, nombre):
        self.nombre = nombre

    def __repr__(self):
        return f"<MetodoPago {self.nombre}>"
class Pago(db.Model, BaseModelMixin):
    """Un cobro. Siempre pertenece a un pedido; la factura es opcional (solo si el
    cliente la pide). Un monto negativo es una devolución (pedido cancelado tras cobrar)."""
    __tablename__ = "pagos"

    id             = db.Column(db.Integer, primary_key=True)
    pedido_id      = db.Column(db.Integer, db.ForeignKey("pedidos.id"),      nullable=False)
    factura_id     = db.Column(db.Integer, db.ForeignKey("facturas.id"),     nullable=True)
    metodo_id      = db.Column(db.Integer, db.ForeignKey("metodos_pago.id"), nullable=False)
    monto          = db.Column(db.Float, nullable=False)
    monto_recibido = db.Column(db.Float, nullable=True)   # solo para efectivo
    fecha          = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    usuario_id     = db.Column(db.Integer, db.ForeignKey("usuarios.id"), nullable=False)

    pedido  = db.relationship("Pedido",     back_populates="pagos")
    factura = db.relationship("Factura",    back_populates="pagos")
    metodo  = db.relationship("MetodoPago", back_populates="pagos")
    usuario = db.relationship("Usuario",    back_populates="pagos")

    def __init__(self, pedido_id, metodo_id, monto, usuario_id,
                 monto_recibido=None, factura_id=None):
        self.pedido_id      = pedido_id
        self.factura_id     = factura_id
        self.metodo_id      = metodo_id
        self.monto          = monto
        self.usuario_id     = usuario_id
        self.monto_recibido = monto_recibido

    @property
    def vuelto(self):
        if self.monto_recibido is not None:
            return max(0, self.monto_recibido - self.monto)
        return 0

    def __repr__(self):
        return f"<Pago pedido={self.pedido_id} monto={self.monto} metodo={self.metodo_id}>"
