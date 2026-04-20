from app.db import db, BaseModelMixin
from datetime import datetime


class TipoEntrega(db.Model, BaseModelMixin):
    __tablename__ = "tipos_entrega"

    id     = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(50), nullable=False, unique=True)

    pedidos = db.relationship("Pedido", back_populates="tipo_entrega")

    def __init__(self, nombre):
        self.nombre = nombre

    def __repr__(self):
        return f"<TipoEntrega {self.nombre}>"


class EstadoPedido(db.Model, BaseModelMixin):
    __tablename__ = "estados_pedido"

    id     = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(50), nullable=False, unique=True)

    pedidos   = db.relationship("Pedido", back_populates="estado")
    historial = db.relationship("PedidoHistorialEstado", back_populates="estado")

    def __init__(self, nombre):
        self.nombre = nombre

    def __repr__(self):
        return f"<EstadoPedido {self.nombre}>"


class Pedido(db.Model, BaseModelMixin):
    __tablename__ = "pedidos"

    id                = db.Column(db.Integer, primary_key=True)
    numero_turno      = db.Column(db.Integer, nullable=True)
    fecha             = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    estado_id         = db.Column(db.Integer, db.ForeignKey("estados_pedido.id"),
                                  nullable=False, default=1)
    tipo_entrega_id   = db.Column(db.Integer, db.ForeignKey("tipos_entrega.id"), nullable=False)
    direccion_entrega = db.Column(db.String(200), nullable=True)
    total             = db.Column(db.Float, nullable=False, default=0)
    cliente_id        = db.Column(db.Integer, db.ForeignKey("clientes.id"),
                                  nullable=False, default=1)
    usuario_id        = db.Column(db.Integer, db.ForeignKey("usuarios.id"), nullable=False)
    turno_id          = db.Column(db.Integer, db.ForeignKey("turnos.id"),   nullable=False)
    updated_at        = db.Column(db.DateTime, nullable=False, default=datetime.utcnow,
                                  onupdate=datetime.utcnow)

    cliente      = db.relationship("Cliente",      back_populates="pedidos")
    usuario      = db.relationship("Usuario",      back_populates="pedidos")
    turno        = db.relationship("Turno",        back_populates="pedidos")
    estado       = db.relationship("EstadoPedido", back_populates="pedidos")
    tipo_entrega = db.relationship("TipoEntrega",  back_populates="pedidos")
    detalles     = db.relationship("DetallePedido", back_populates="pedido",
                                   cascade="all, delete-orphan")
    historial    = db.relationship("PedidoHistorialEstado", back_populates="pedido",
                                   cascade="all, delete-orphan")
    facturas     = db.relationship("Factura", back_populates="pedido")

    def __init__(self, tipo_entrega_id, usuario_id, turno_id,
                 cliente_id=1, direccion_entrega=None, estado_id=1):
        self.tipo_entrega_id   = tipo_entrega_id
        self.usuario_id        = usuario_id
        self.turno_id          = turno_id
        self.cliente_id        = cliente_id
        self.direccion_entrega = direccion_entrega
        self.estado_id         = estado_id
        self.total             = 0
        ultimo = (
        db.session.query(db.func.max(Pedido.numero_turno))
        .filter(Pedido.turno_id == turno_id)
        .scalar()
        )
        self.numero_turno = (ultimo or 0) + 1
    def calcular_total(self):
        self.total = sum(d.subtotal for d in self.detalles)
        return self.total

    def cambiar_estado(self, nuevo_estado_id, usuario_id):
        self.estado_id = nuevo_estado_id
        historial = PedidoHistorialEstado(
            pedido_id  = self.id,
            estado_id  = nuevo_estado_id,
            usuario_id = usuario_id
        )
        db.session.add(historial)
        db.session.commit()

    def __repr__(self):
        return f"<Pedido {self.id} estado={self.estado_id} total={self.total}>"


class PedidoHistorialEstado(db.Model, BaseModelMixin):
    __tablename__ = "pedido_historial_estado"

    id         = db.Column(db.Integer, primary_key=True)
    pedido_id  = db.Column(db.Integer, db.ForeignKey("pedidos.id"),        nullable=False)
    estado_id  = db.Column(db.Integer, db.ForeignKey("estados_pedido.id"), nullable=False)
    usuario_id = db.Column(db.Integer, db.ForeignKey("usuarios.id"),       nullable=False)
    fecha      = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    pedido  = db.relationship("Pedido",       back_populates="historial")
    estado  = db.relationship("EstadoPedido", back_populates="historial")
    usuario = db.relationship("Usuario",      back_populates="historial_estados")

    def __init__(self, pedido_id, estado_id, usuario_id):
        self.pedido_id  = pedido_id
        self.estado_id  = estado_id
        self.usuario_id = usuario_id

    def __repr__(self):
        return f"<PedidoHistorialEstado pedido={self.pedido_id} estado={self.estado_id}>"


class DetallePedido(db.Model, BaseModelMixin):
    __tablename__ = "detalle_pedido"

    id              = db.Column(db.Integer, primary_key=True)
    pedido_id       = db.Column(db.Integer, db.ForeignKey("pedidos.id"),   nullable=False)
    producto_id     = db.Column(db.Integer, db.ForeignKey("productos.id"), nullable=True)
    combo_id        = db.Column(db.Integer, db.ForeignKey("combos.id"),    nullable=True)
    tamano_id       = db.Column(db.Integer, db.ForeignKey("tamanos.id"),   nullable=True)
    cantidad        = db.Column(db.Integer, nullable=False)
    precio_unitario = db.Column(db.Float,   nullable=False)
    subtotal        = db.Column(db.Float,   nullable=False, default=0)
    is_mitad        = db.Column(db.Boolean, nullable=False, default=False,
                                server_default='false')
    
    notas           = db.Column(db.Text, nullable=True)

    pedido   = db.relationship("Pedido",   back_populates="detalles")
    producto = db.relationship("Producto", back_populates="detalles_pedido")
    combo    = db.relationship("Combo",    back_populates="detalles_pedido")
    tamano   = db.relationship("Tamano",   foreign_keys=[tamano_id])
    extras   = db.relationship("DetalleExtra",  back_populates="detalle",
                               cascade="all, delete-orphan")
    mitades  = db.relationship("DetalleMitad",  back_populates="detalle",
                               cascade="all, delete-orphan")

    def __init__(self, pedido_id, cantidad, precio_unitario,
                 producto_id=None, combo_id=None, tamano_id=None,
                 is_mitad=False, notas=None):                          # ✅ notas agregado
        if not is_mitad and not producto_id and not combo_id:
            raise ValueError("Debe especificar producto_id, combo_id, o is_mitad=True")
        if producto_id and combo_id:
            raise ValueError("No puede especificar producto_id y combo_id al mismo tiempo")

        self.pedido_id       = pedido_id
        self.producto_id     = producto_id
        self.combo_id        = combo_id
        self.tamano_id       = tamano_id
        self.cantidad        = cantidad
        self.precio_unitario = precio_unitario
        self.subtotal        = precio_unitario * cantidad
        self.is_mitad        = is_mitad
        self.notas           = notas                                   # ✅ notas agregado

    def calcular_subtotal(self):
        """Subtotal para producto/combo normal incluyendo extras."""
        base        = self.precio_unitario * self.cantidad
        extra_total = sum(e.precio_extra * e.cantidad for e in self.extras)
        self.subtotal = base + extra_total
        return self.subtotal

    def calcular_subtotal_mitad(self):
        """
        Subtotal para pizza mitad/mitad.
        precio_unitario ya viene calculado (max entre las 2 mitades + extras).
        Solo multiplica por cantidad y suma extras de cada mitad.
        """
        extras_mitad = 0.0
        for mitad in self.mitades:
            for extra in mitad.extras:
                from app.ingredientes.models import IngredienteTamano
                it = IngredienteTamano.query.filter_by(
                    ingrediente_id = extra.ingrediente_id,
                    tamano_id      = self.tamano_id
                ).first()
                precio_extra  = it.precio_extra if it else 0.0
                extras_mitad += precio_extra * extra.cantidad

        self.subtotal = (self.precio_unitario * self.cantidad) + extras_mitad
        return self.subtotal

    def __repr__(self):
        if self.is_mitad:
            return f"<DetallePedido mitad/mitad x{self.cantidad}>"
        item = f"producto={self.producto_id}" if self.producto_id else f"combo={self.combo_id}"
        return f"<DetallePedido {item} x{self.cantidad}>"


class DetalleExtra(db.Model, BaseModelMixin):
    __tablename__ = "detalle_extras"

    id             = db.Column(db.Integer, primary_key=True)
    detalle_id     = db.Column(db.Integer, db.ForeignKey("detalle_pedido.id"), nullable=False)
    ingrediente_id = db.Column(db.Integer, db.ForeignKey("ingredientes.id"),   nullable=False)
    tamano_id      = db.Column(db.Integer, db.ForeignKey("tamanos.id"),        nullable=True)
    cantidad       = db.Column(db.Integer, nullable=False, default=1)
    precio_extra   = db.Column(db.Float,   nullable=False)

    detalle     = db.relationship("DetallePedido", back_populates="extras")
    ingrediente = db.relationship("Ingrediente",   back_populates="detalle_extras")
    tamano      = db.relationship("Tamano")

    def __init__(self, detalle_id, ingrediente_id, precio_extra, cantidad=1, tamano_id=None):
        self.detalle_id     = detalle_id
        self.ingrediente_id = ingrediente_id
        self.precio_extra   = precio_extra
        self.cantidad       = cantidad
        self.tamano_id      = tamano_id

    def __repr__(self):
        return f"<DetalleExtra ing={self.ingrediente_id} x{self.cantidad}>"


class DetalleMitad(db.Model, BaseModelMixin):
    __tablename__ = "detalle_mitad"

    id          = db.Column(db.Integer, primary_key=True)
    detalle_id  = db.Column(db.Integer, db.ForeignKey("detalle_pedido.id"), nullable=False)
    mitad       = db.Column(db.Integer, nullable=False)   # 1 o 2
    producto_id = db.Column(db.Integer, db.ForeignKey("productos.id"),      nullable=False)

    detalle  = db.relationship("DetallePedido", back_populates="mitades")
    producto = db.relationship("Producto")
    extras   = db.relationship("DetalleMitadExtra", back_populates="mitad_detalle",
                               cascade="all, delete-orphan")

    def __init__(self, detalle_id, mitad, producto_id):
        if mitad not in (1, 2):
            raise ValueError("mitad debe ser 1 o 2")
        self.detalle_id  = detalle_id
        self.mitad       = mitad
        self.producto_id = producto_id

    def __repr__(self):
        return f"<DetalleMitad mitad={self.mitad} producto={self.producto_id}>"


class DetalleMitadExtra(db.Model, BaseModelMixin):
    __tablename__ = "detalle_mitad_extra"

    id               = db.Column(db.Integer, primary_key=True)
    detalle_mitad_id = db.Column(db.Integer, db.ForeignKey("detalle_mitad.id"), nullable=False)
    ingrediente_id   = db.Column(db.Integer, db.ForeignKey("ingredientes.id"),  nullable=False)
    cantidad         = db.Column(db.Integer, nullable=False, default=1)

    mitad_detalle = db.relationship("DetalleMitad",  back_populates="extras")
    ingrediente   = db.relationship("Ingrediente")

    def __init__(self, detalle_mitad_id, ingrediente_id, cantidad=1):
        self.detalle_mitad_id = detalle_mitad_id
        self.ingrediente_id   = ingrediente_id
        self.cantidad         = cantidad

    def __repr__(self):
        return f"<DetalleMitadExtra ing={self.ingrediente_id} x{self.cantidad}>"