from app.db import db
from datetime import datetime


class MovimientoStock(db.Model):
    __tablename__ = 'movimiento_stock'

    id             = db.Column(db.Integer, primary_key=True)
    producto_id    = db.Column(db.Integer, db.ForeignKey('productos.id'), nullable=False)
    usuario_id     = db.Column(db.Integer, db.ForeignKey('usuarios.id'), nullable=False)
    turno_id       = db.Column(db.Integer, db.ForeignKey('turnos.id'), nullable=True)
    cantidad       = db.Column(db.Integer, nullable=False)
    stock_anterior = db.Column(db.Integer, nullable=True)
    stock_nuevo    = db.Column(db.Integer, nullable=True)
    fecha          = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    producto = db.relationship('Producto',  backref='movimientos_stock', lazy='select')
    usuario  = db.relationship('Usuario',   backref='movimientos_stock', lazy='select')
    turno    = db.relationship('Turno',     backref='movimientos_stock', lazy='select')

    @property
    def usuario_nombre(self):
        return self.usuario.nombre if self.usuario else None

    @property
    def producto_nombre(self):
        return self.producto.nombre if self.producto else None
    
    def to_dict(self):
        return {
            'id':             self.id,
            'producto_id':    self.producto_id,
            'producto_nombre': self.producto.nombre if self.producto else None,
            'usuario_id':     self.usuario_id,
            'usuario_nombre': self.usuario.nombre if self.usuario else None,
            'turno_id':       self.turno_id,
            'cantidad':       self.cantidad,
            'stock_anterior': self.stock_anterior,
            'stock_nuevo':    self.stock_nuevo,
            'fecha':          self.fecha.isoformat(),
        }