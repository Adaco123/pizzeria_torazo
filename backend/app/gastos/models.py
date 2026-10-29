from datetime import datetime

from app.db import db, BaseModelMixin

# clave -> nombre para mostrar
CATEGORIAS_GASTO = {
    'insumos': 'Insumos',
    'gas_servicios': 'Gas / servicios',
    'proveedor': 'Pago a proveedor',
    'retiro': 'Retiro del dueño',
    'otro': 'Otro',
}


class GastoCaja(db.Model, BaseModelMixin):
    """Efectivo que sale de la caja durante un turno (compras, pagos, retiros)."""
    __tablename__ = "gastos_caja"

    id          = db.Column(db.Integer, primary_key=True)
    turno_id    = db.Column(db.Integer, db.ForeignKey("turnos.id"),   nullable=False)
    usuario_id  = db.Column(db.Integer, db.ForeignKey("usuarios.id"), nullable=False)
    monto       = db.Column(db.Float, nullable=False)
    categoria   = db.Column(db.String(20), nullable=False)
    descripcion = db.Column(db.String(200), nullable=False)
    fecha       = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    # Un gasto mal anotado no se borra: se anula y queda el rastro de quién y cuándo.
    anulado        = db.Column(db.Boolean, nullable=False, default=False, server_default=db.false())
    anulado_por_id = db.Column(db.Integer, db.ForeignKey("usuarios.id"), nullable=True)
    anulado_en     = db.Column(db.DateTime, nullable=True)

    turno       = db.relationship("Turno", back_populates="gastos")
    usuario     = db.relationship("Usuario", foreign_keys=[usuario_id])
    anulado_por = db.relationship("Usuario", foreign_keys=[anulado_por_id])

    def __init__(self, turno_id, usuario_id, monto, categoria, descripcion):
        self.turno_id    = turno_id
        self.usuario_id  = usuario_id
        self.monto       = monto
        self.categoria   = categoria
        self.descripcion = descripcion

    def __repr__(self):
        return f"<GastoCaja {self.id} Bs {self.monto} {self.categoria}>"
