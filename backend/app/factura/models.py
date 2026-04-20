from app.db import db, BaseModelMixin
from datetime import datetime
class Factura(db.Model, BaseModelMixin):
    __tablename__ = "facturas"

    id             = db.Column(db.Integer, primary_key=True)
    numero_factura = db.Column(db.String(20), nullable=False, unique=True)
    pedido_id      = db.Column(db.Integer, db.ForeignKey("pedidos.id"),  nullable=False)
    cliente_id     = db.Column(db.Integer, db.ForeignKey("clientes.id"), nullable=False)
    fecha          = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    subtotal       = db.Column(db.Float, nullable=False)
    descuento      = db.Column(db.Float, nullable=False, default=0)
    impuesto       = db.Column(db.Float, nullable=False, default=0)
    total          = db.Column(db.Float, nullable=False)
    anulada        = db.Column(db.Boolean, nullable=False, default=False)
    usuario_id     = db.Column(db.Integer, db.ForeignKey("usuarios.id"), nullable=False)

    pedido  = db.relationship("Pedido",   back_populates="facturas")
    cliente = db.relationship("Cliente",  back_populates="facturas")
    usuario = db.relationship("Usuario",  back_populates="facturas")
    pagos   = db.relationship("Pago",     back_populates="factura",
                              cascade="all, delete-orphan")

    def __init__(self, numero_factura, pedido_id, cliente_id, usuario_id,
                 subtotal, descuento=0, impuesto=0):
        self.numero_factura = numero_factura
        self.pedido_id      = pedido_id
        self.cliente_id     = cliente_id
        self.usuario_id     = usuario_id
        self.subtotal       = subtotal
        self.descuento      = descuento
        self.impuesto       = impuesto
        self.total          = (subtotal - descuento) + impuesto
        self.anulada        = False

    def calcular_total(self):
        self.total = (self.subtotal - self.descuento) + self.impuesto
        return self.total

    def anular(self):
        self.anulada = True
        db.session.commit()

    def __repr__(self):
        return f"<Factura {self.numero_factura} total={self.total} anulada={self.anulada}>"
