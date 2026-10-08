from app.db import db, BaseModelMixin
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timezone

# Nombre exacto del rol con privilegios de administrador (lo comparan admin_required y users)
ROL_ADMINISTRADOR = "Administrador"
ROL_CAJERO = "Cajero"
ROL_PIZZERO = "Pizzero"

class Usuario(db.Model, BaseModelMixin):
    __tablename__ = "usuarios"

    id         = db.Column(db.Integer, primary_key=True)
    nombre     = db.Column(db.String(100), nullable=False)
    correo     = db.Column(db.String(120), nullable=False, unique=True)
    contra     = db.Column(db.String(255), nullable=False)  
    rol_id     = db.Column(db.Integer, db.ForeignKey("roles.id"), nullable=False)
    activo     = db.Column(db.Boolean, nullable=False, default=True)
    cedula     = db.Column(db.String(20), nullable=False, unique=True)
    codigo     = db.Column(db.String(20), nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.now(timezone.utc),
                           onupdate=datetime.now(timezone.utc))

    rol               = db.relationship("Role", back_populates="usuarios")
    turnos            = db.relationship("Turno", back_populates="usuario")
    pedidos           = db.relationship("Pedido", back_populates="usuario")
    pagos             = db.relationship("Pago", back_populates="usuario")
    facturas          = db.relationship("Factura", back_populates="usuario")
    historial_estados = db.relationship("PedidoHistorialEstado", back_populates="usuario")

    def __init__(self, nombre, correo, contra, rol_id, cedula,
                 activo=True, codigo=None):
        self.nombre  = nombre
        self.correo  = correo
        self.set_password(contra)
        self.rol_id  = rol_id
        self.cedula  = cedula
        self.activo  = activo
        self.codigo  = codigo

    def __repr__(self):
        return f"<Usuario {self.nombre}>"
    def __str__(self):
        return self.nombre
    def set_password(self, contra):
        self.contra = generate_password_hash(contra)

    def check_password(self, contra):
        return check_password_hash(self.contra, contra)
    @staticmethod
    def get_by_email(correo):
        return Usuario.query.filter_by(correo=correo).first()
class Role(db.Model, BaseModelMixin):
    __tablename__ = "roles"

    id     = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(30), nullable=False, unique=True)

    usuarios = db.relationship("Usuario", back_populates="rol")

    def __init__(self, nombre):
        self.nombre = nombre

    def __repr__(self):
        return f"<Role {self.nombre}>"