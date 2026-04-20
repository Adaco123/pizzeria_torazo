from datetime import datetime
from app.db import db, BaseModelMixin
class Turno(db.Model, BaseModelMixin):
    __tablename__ = "turnos"

    id           = db.Column(db.Integer, primary_key=True)
    usuario_id   = db.Column(db.Integer, db.ForeignKey("usuarios.id"), nullable=False)
    apertura     = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    cierre       = db.Column(db.DateTime, nullable=True)
    monto_inicio = db.Column(db.Float, nullable=False, default=0)
    monto_cierre = db.Column(db.Float, nullable=True)

    usuario = db.relationship("Usuario", back_populates="turnos")
    pedidos = db.relationship("Pedido",  back_populates="turno")

    def __init__(self, usuario_id, monto_inicio=0):
        self.usuario_id   = usuario_id
        self.monto_inicio = monto_inicio

    @property
    def abierto(self):
        return self.cierre is None

    def cerrar(self, monto_cierre):
        self.cierre       = datetime.utcnow()
        self.monto_cierre = monto_cierre
        db.session.commit()

    def __repr__(self):
        return f"<Turno {self.id} usuario={self.usuario_id} abierto={self.abierto}>"

