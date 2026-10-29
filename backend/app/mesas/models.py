from datetime import datetime

from app.db import db, BaseModelMixin


class Mesa(db.Model, BaseModelMixin):
    """Una mesa del local. Se desactiva en lugar de borrarse si ya tuvo cuentas."""
    __tablename__ = "mesas"

    id     = db.Column(db.Integer, primary_key=True)
    numero = db.Column(db.Integer, nullable=False, unique=True)
    activa = db.Column(db.Boolean, nullable=False, default=True, server_default=db.true())

    cuentas = db.relationship("CuentaMesa", back_populates="mesa")

    def __init__(self, numero, activa=True):
        self.numero = numero
        self.activa = activa

    def __repr__(self):
        return f"<Mesa {self.numero}>"


class CuentaMesa(db.Model, BaseModelMixin):
    """Cuenta abierta de una mesa: acumula las rondas (pedidos) y se cobra una sola vez al final.

    estado: 'abierta' -> 'cobrada' (se pagó todo) o 'anulada' (se abrió por error / sin consumo).
    El turno es el del cajero que responde por esta caja; ahí caen los pagos al cobrar.
    """
    __tablename__ = "cuentas_mesa"

    id             = db.Column(db.Integer, primary_key=True)
    mesa_id        = db.Column(db.Integer, db.ForeignKey("mesas.id"),    nullable=False)
    turno_id       = db.Column(db.Integer, db.ForeignKey("turnos.id"),   nullable=False)
    abierta_por_id = db.Column(db.Integer, db.ForeignKey("usuarios.id"), nullable=False)
    abierta_en     = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    estado         = db.Column(db.String(10), nullable=False, default='abierta')
    pidio_cuenta   = db.Column(db.Boolean, nullable=False, default=False, server_default=db.false())
    cerrada_en     = db.Column(db.DateTime, nullable=True)
    cerrada_por_id = db.Column(db.Integer, db.ForeignKey("usuarios.id"), nullable=True)

    mesa        = db.relationship("Mesa", back_populates="cuentas")
    turno       = db.relationship("Turno")
    abierta_por = db.relationship("Usuario", foreign_keys=[abierta_por_id])
    cerrada_por = db.relationship("Usuario", foreign_keys=[cerrada_por_id])
    pedidos     = db.relationship("Pedido", back_populates="cuenta",
                                  order_by="Pedido.id")

    def __init__(self, mesa_id, turno_id, abierta_por_id):
        self.mesa_id = mesa_id
        self.turno_id = turno_id
        self.abierta_por_id = abierta_por_id

    @property
    def abierta(self):
        return self.estado == 'abierta'

    def __repr__(self):
        return f"<CuentaMesa {self.id} mesa={self.mesa_id} {self.estado}>"
