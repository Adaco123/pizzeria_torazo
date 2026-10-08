from flask import Blueprint, request
from flask_jwt_extended import jwt_required
from flask_restful import Api, Resource
from marshmallow import ValidationError
from sqlalchemy.exc import SQLAlchemyError
from app.db import db
from app.pedidos.models import (
    Pedido, DetallePedido, DetalleExtra,
    DetalleMitad, DetalleMitadExtra, TipoEntrega, EstadoPedido
)
from app.pedidos import servicio
from app.pedidos.servicio import ReglaNegocio, manejar_reglas
from app.productos.models import Producto, ProductoTamano
from app.ingredientes.models import Ingrediente, IngredienteTamano
from app.clientes.models import Cliente
from app.turnos.models import Turno
from app.users.models import Usuario, ROL_ADMINISTRADOR, ROL_CAJERO, ROL_PIZZERO
from app.tamanos.models import Tamano
from app.pedidos.api_v1_0.schemas import (
    PedidoSchema, DetallePedidoSchema, DetalleExtrasSchema,
    DetalleMitadSchema, CobrarSchema
)
from app.combos.models import Combo, ComboProducto

pedidos_v1_0_bp = Blueprint('pedidos_v1_0_bp', __name__)
api = Api(pedidos_v1_0_bp)

pedido_schema   = PedidoSchema()
pedidos_schema  = PedidoSchema(many=True)
detalle_schema  = DetallePedidoSchema()
detalles_schema = DetallePedidoSchema(many=True)
extra_schema    = DetalleExtrasSchema()
extras_schema   = DetalleExtrasSchema(many=True)
mitad_schema    = DetalleMitadSchema()
cobrar_schema   = CobrarSchema()


# Tipos de entrega base (el orden fija el id autoincremental: Local=1, Domicilio=2).
# No hay endpoint para listarlos, asi que el frontend usa estos ids.
TIPOS_ENTREGA_POR_DEFECTO = ["Local", "Domicilio"]


def _asegurar_tipos_entrega_por_defecto():
    hay_nuevos = False
    for nombre in TIPOS_ENTREGA_POR_DEFECTO:
        if not TipoEntrega.query.filter_by(nombre=nombre).first():
            db.session.add(TipoEntrega(nombre=nombre))
            hay_nuevos = True
    if hay_nuevos:
        db.session.commit()


# Estados de pedido base. El orden fija el id autoincremental: pendiente TIENE que ser 1
# (el pedido nace con estado_id=1). Los nombres los usan el PATCH de estado y los
# resumenes de turno (que excluyen 'cancelado').
ESTADOS_PEDIDO_POR_DEFECTO = servicio.ESTADOS_PEDIDO


def _asegurar_estados_pedido_por_defecto():
    servicio.asegurar_estados_por_defecto()


def actualizar_total_pedido(pedido_id):
    pedido = Pedido.query.get(pedido_id)
    if not pedido:
        return
    servicio.recalcular_total(pedido)


def _obtener_pedido_editable(pedido_id):
    """Pedido que el usuario puede modificar: existe, es suyo y sigue siendo borrador."""
    pedido = Pedido.query.get(pedido_id)
    if not pedido:
        raise ReglaNegocio('Pedido no encontrado', 404)
    servicio.exigir_rol(ROL_CAJERO, ROL_ADMINISTRADOR)
    servicio.exigir_acceso_pedido(pedido)
    servicio.exigir_borrador(pedido)
    return pedido


class PedidoListResource(Resource):

    @jwt_required()
    @manejar_reglas
    def get(self):
        try:
            rol = servicio.rol_actual()
            query = Pedido.query
            if rol == ROL_CAJERO:
                query = query.filter(Pedido.usuario_id == servicio.usuario_actual().id)
            elif rol == ROL_PIZZERO:
                query = query.join(EstadoPedido, Pedido.estado_id == EstadoPedido.id) \
                             .filter(EstadoPedido.nombre != 'pendiente')

            turno_id = request.args.get('turno_id', type=int)
            if turno_id:
                query = query.filter(Pedido.turno_id == turno_id)

            pedidos = query.all()
            return {
                'success': True,
                'data':    pedidos_schema.dump(pedidos),
                'count':   len(pedidos)
            }, 200
        except SQLAlchemyError as e:
            return {'success': False, 'error': str(e)}, 500

    @jwt_required()
    @manejar_reglas
    def post(self):
        _asegurar_tipos_entrega_por_defecto()
        _asegurar_estados_pedido_por_defecto()
        data = request.get_json() or {}

        servicio.exigir_rol(ROL_CAJERO, ROL_ADMINISTRADOR)
        actual = servicio.usuario_actual()
        es_admin = servicio.es_admin()

        campos_requeridos = ['cliente_id', 'tipo_entrega_id', 'turno_id']
        faltantes = [c for c in campos_requeridos if data.get(c) is None]
        if faltantes:
            return {'success': False, 'error': f'Faltan campos: {faltantes}'}, 400

        # Un cajero solo registra pedidos a su nombre; el admin puede hacerlo por otro usuario.
        usuario_id = data.get('usuario_id') if es_admin else actual.id
        if usuario_id is None:
            usuario_id = actual.id
        if not es_admin and data.get('usuario_id') not in (None, actual.id):
            return {'success': False, 'error': 'Solo puedes crear pedidos a tu nombre'}, 403

        cliente = Cliente.query.get(data['cliente_id'])
        if not cliente:
            return {'success': False, 'error': 'Cliente no existe'}, 404

        usuario = Usuario.query.get(usuario_id)
        if not usuario:
            return {'success': False, 'error': 'Usuario no existe'}, 404

        tipo_entrega = TipoEntrega.query.get(data['tipo_entrega_id'])
        if not tipo_entrega:
            return {'success': False, 'error': 'Tipo de entrega no existe'}, 404

        turno = Turno.query.get(data['turno_id'])
        if not turno:
            return {'success': False, 'error': 'Turno no existe'}, 404
        servicio.exigir_turno_abierto(turno)
        if not es_admin and turno.usuario_id != actual.id:
            return {'success': False, 'error': 'Ese turno es de otro usuario'}, 403

        direccion = (data.get('direccion_entrega') or '').strip() or None
        if tipo_entrega.nombre == 'Domicilio' and not direccion:
            return {'success': False, 'error': 'Escribe la dirección de entrega'}, 400

        try:
            pedido = Pedido(
                cliente_id        = data['cliente_id'],
                usuario_id        = usuario_id,
                turno_id          = data['turno_id'],
                tipo_entrega_id   = data['tipo_entrega_id'],
                direccion_entrega = direccion,
            )
            db.session.add(pedido)
            db.session.commit()
            return {
                'success': True,
                'message': 'Pedido creado exitosamente',
                'data':    pedido_schema.dump(pedido)
            }, 201
        except SQLAlchemyError as e:
            db.session.rollback()
            return {'success': False, 'error': str(e)}, 500


class PedidoDetailResource(Resource):

    @jwt_required()
    @manejar_reglas
    def get(self, pedido_id):
        try:
            pedido = Pedido.query.get(pedido_id)
            if not pedido:
                return {'success': False, 'error': 'Pedido no encontrado'}, 404
            servicio.exigir_acceso_pedido(pedido)
            return {'success': True, 'data': pedido_schema.dump(pedido)}, 200
        except SQLAlchemyError as e:
            return {'success': False, 'error': str(e)}, 500

    @jwt_required()
    @manejar_reglas
    def put(self, pedido_id):
        """Solo la entrega y la dirección, y solo mientras el pedido es borrador.
        El estado cambia únicamente por /cobrar y /estado."""
        try:
            pedido = _obtener_pedido_editable(pedido_id)

            data = request.get_json() or {}
            if 'estado_id' in data:
                return {'success': False,
                        'error': 'El estado no se cambia aquí: usa /cobrar o /estado'}, 400

            if 'tipo_entrega_id' in data:
                if not TipoEntrega.query.get(data['tipo_entrega_id']):
                    return {'success': False, 'error': 'Tipo de entrega no existe'}, 404
                pedido.tipo_entrega_id = data['tipo_entrega_id']
            if 'direccion_entrega' in data:
                pedido.direccion_entrega = (data['direccion_entrega'] or '').strip() or None

            db.session.flush()
            db.session.refresh(pedido)
            if pedido.tipo_entrega and pedido.tipo_entrega.nombre == 'Domicilio' \
                    and not pedido.direccion_entrega:
                db.session.rollback()
                return {'success': False, 'error': 'Escribe la dirección de entrega'}, 400

            db.session.commit()
            return {
                'success': True,
                'message': 'Pedido actualizado',
                'data':    pedido_schema.dump(pedido)
            }, 200
        except SQLAlchemyError as e:
            db.session.rollback()
            return {'success': False, 'error': str(e)}, 500

    @jwt_required()
    @manejar_reglas
    def delete(self, pedido_id):
        """Descarta un borrador. Un pedido ya cobrado no se borra: se cancela."""
        try:
            pedido = _obtener_pedido_editable(pedido_id)
            if pedido.pagos:
                return {'success': False,
                        'error': 'El pedido tiene pagos: cancélalo en lugar de borrarlo'}, 409
            db.session.delete(pedido)
            db.session.commit()
            return {'success': True, 'message': 'Pedido eliminado'}, 200
        except SQLAlchemyError as e:
            db.session.rollback()
            return {'success': False, 'error': str(e)}, 500


class PedidoCobrarResource(Resource):

    @jwt_required()
    @manejar_reglas
    def post(self, pedido_id):
        """
        Cobra el pedido y lo manda a cocina en una sola transacción.

        JSON esperado:
        {
            "pagos": [
                { "metodo_id": 1, "monto": 100.0, "monto_recibido": 200.0 },
                { "metodo_id": 2, "monto": 91.0 }
            ]
        }
        La suma de los montos tiene que ser igual al total del pedido.
        """
        pedido = Pedido.query.get(pedido_id)
        if not pedido:
            return {'success': False, 'error': 'Pedido no encontrado'}, 404

        try:
            datos = cobrar_schema.load(request.get_json() or {})
        except ValidationError as err:
            return {'success': False, 'error': servicio.primer_mensaje(err.messages)}, 400

        try:
            vuelto = servicio.cobrar_pedido(pedido, datos['pagos'])
        except SQLAlchemyError as e:
            db.session.rollback()
            return {'success': False, 'error': str(e)}, 500

        return {
            'success': True,
            'message': f'Pedido cobrado. Ficha {pedido.numero_turno}',
            'vuelto':  vuelto,
            'data':    pedido_schema.dump(pedido)
        }, 200


class DetalleMitadResource(Resource):

    @jwt_required()
    @manejar_reglas
    def post(self, pedido_id):
        """
        JSON esperado:
        {
            "tamano_id": 3,
            "cantidad": 1,
            "notas": "sin cebolla en la margarita",
            "mitades": [
                { "mitad": 1, "producto_id": 7, "extras": [{"ingrediente_id": 4, "cantidad": 1}] },
                { "mitad": 2, "producto_id": 6, "extras": [{"ingrediente_id": 9, "cantidad": 1}] }
            ]
        }
        """
        try:
            _obtener_pedido_editable(pedido_id)

            data = request.get_json() or {}

            if not data.get('tamano_id'):
                return {'success': False, 'error': 'tamano_id es requerido'}, 400

            mitades_data = data.get('mitades', [])
            if len(mitades_data) != 2:
                return {'success': False, 'error': 'Debe enviar exactamente 2 mitades'}, 400

            if not Tamano.query.get(data['tamano_id']):
                return {'success': False, 'error': 'Tamaño no existe'}, 404

            for m in mitades_data:
                if not m.get('producto_id') or not m.get('mitad'):
                    return {'success': False, 'error': 'Cada mitad necesita producto_id y mitad (1 o 2)'}, 400
                if m['mitad'] not in (1, 2):
                    return {'success': False, 'error': 'mitad debe ser 1 o 2'}, 400
                if not Producto.query.get(m['producto_id']):
                    return {'success': False, 'error': f'Producto {m["producto_id"]} no existe'}, 404

            precios = []
            for m in mitades_data:
                pt = ProductoTamano.query.filter_by(
                    producto_id = m['producto_id'],
                    tamano_id   = data['tamano_id']
                ).first()
                precios.append(pt.precio if pt else 0.0)

            if not any(precios):
                return {'success': False, 'error': 'No se encontró precio para las mitades con ese tamaño'}, 400

            precio_base = max(precios)
            cantidad    = int(data.get('cantidad', 1))

            extras_total = 0.0
            for m in mitades_data:
                for extra in m.get('extras', []):
                    it = IngredienteTamano.query.filter_by(
                        ingrediente_id = extra['ingrediente_id'],
                        tamano_id      = data['tamano_id']
                    ).first()
                    extras_total += (it.precio_extra if it else 0.0) * int(extra.get('cantidad', 1))

            precio_unitario = precio_base + extras_total

            detalle = DetallePedido(
                pedido_id       = pedido_id,
                tamano_id       = data['tamano_id'],
                cantidad        = cantidad,
                precio_unitario = precio_unitario,
                is_mitad        = True,
                notas           = data.get('notas') or None,  # ✅ NUEVO
            )
            db.session.add(detalle)
            db.session.flush()

            for m in mitades_data:
                mitad_obj = DetalleMitad(
                    detalle_id  = detalle.id,
                    mitad       = m['mitad'],
                    producto_id = m['producto_id']
                )
                db.session.add(mitad_obj)
                db.session.flush()

                for extra in m.get('extras', []):
                    ingrediente = Ingrediente.query.get(extra['ingrediente_id'])
                    if not ingrediente:
                        db.session.rollback()
                        return {'success': False, 'error': f'Ingrediente {extra["ingrediente_id"]} no existe'}, 404

                    db.session.add(DetalleMitadExtra(
                        detalle_mitad_id = mitad_obj.id,
                        ingrediente_id   = extra['ingrediente_id'],
                        cantidad         = int(extra.get('cantidad', 1))
                    ))

            actualizar_total_pedido(pedido_id)
            db.session.commit()

            return {
                'success': True,
                'message': 'Pizza mitad/mitad agregada al pedido',
                'data':    detalle_schema.dump(detalle)
            }, 201

        except SQLAlchemyError as e:
            db.session.rollback()
            return {'success': False, 'error': str(e)}, 500

class DetalleExtrasResource(Resource):

    @jwt_required()
    @manejar_reglas
    def post(self, pedido_id, detalle_id):
        try:
            _obtener_pedido_editable(pedido_id)

            detalle = DetallePedido.query.filter_by(
                id=detalle_id, pedido_id=pedido_id
            ).first()
            if not detalle:
                return {'success': False, 'error': 'Detalle no encontrado'}, 404

            if detalle.is_mitad:
                return {
                    'success': False,
                    'error': 'Esta pizza es mitad/mitad. Usa el endpoint de extras por mitad'
                }, 400

            data = request.get_json() or {}
            if not data.get('ingrediente_id'):
                return {'success': False, 'error': 'Faltan datos requeridos'}, 400

            ingrediente = Ingrediente.query.get(data['ingrediente_id'])
            if not ingrediente:
                return {'success': False, 'error': 'Ingrediente no existe'}, 404

            precio_extra = ingrediente.precio_extra
            if detalle.tamano_id:
                config = IngredienteTamano.query.filter_by(
                    ingrediente_id = data['ingrediente_id'],
                    tamano_id      = detalle.tamano_id
                ).first()
                if config:
                    precio_extra = config.precio_extra

            extra = DetalleExtra(
                detalle_id     = detalle_id,
                ingrediente_id = data['ingrediente_id'],
                precio_extra   = float(precio_extra),
                cantidad       = int(data.get('cantidad', 1)),
                tamano_id      = detalle.tamano_id
            )
            db.session.add(extra)
            db.session.flush()

            detalle.calcular_subtotal()
            actualizar_total_pedido(pedido_id)
            db.session.commit()

            return {
                'success': True,
                'message': 'Extra agregado al producto',
                'data':    extra_schema.dump(extra)
            }, 201

        except SQLAlchemyError as e:
            db.session.rollback()
            return {'success': False, 'error': str(e)}, 500

    @jwt_required()
    @manejar_reglas
    def delete(self, pedido_id, detalle_id, extra_id=None):
        if not extra_id:
            return {'success': False, 'error': 'ID del extra requerido'}, 400

        try:
            _obtener_pedido_editable(pedido_id)

            extra = DetalleExtra.query.get(extra_id)
            if not extra or extra.detalle_id != detalle_id:
                return {'success': False, 'error': 'Extra no encontrado'}, 404

            detalle = DetallePedido.query.get(detalle_id)
            if detalle.pedido_id != pedido_id:
                return {'success': False, 'error': 'Extra no encontrado'}, 404

            db.session.delete(extra)
            db.session.flush()

            detalle.calcular_subtotal()
            actualizar_total_pedido(pedido_id)
            db.session.commit()

            return {'success': True, 'message': 'Extra eliminado'}, 200

        except SQLAlchemyError as e:
            db.session.rollback()
            return {'success': False, 'error': str(e)}, 500

class PedidoEstadoResource(Resource):

    @jwt_required()
    @manejar_reglas
    def patch(self, pedido_id):
        """
        JSON esperado: { "estado": "listo" }
        Para cancelar: { "estado": "cancelado", "motivo": "..." } (el motivo es obligatorio
        si el pedido ya estaba cobrado). Pasar de pendiente a confirmado no se hace aquí:
        ocurre al cobrar.
        """
        try:
            _asegurar_estados_pedido_por_defecto()
            pedido = Pedido.query.get(pedido_id)
            if not pedido:
                return {'success': False, 'error': 'Pedido no encontrado'}, 404

            data = request.get_json() or {}
            servicio.cambiar_estado_pedido(pedido, data.get('estado'), data.get('motivo'))

            return {
                'success': True,
                'message': f'Pedido marcado como {data["estado"]}',
                'data':    pedido_schema.dump(pedido)
            }, 200

        except SQLAlchemyError as e:
            db.session.rollback()
            return {'success': False, 'error': str(e)}, 500


class DetallePedidoItemResource(Resource):

    @jwt_required()
    @manejar_reglas
    def delete(self, pedido_id, detalle_id):
        """Quita un producto del borrador. Ya cobrado, el pedido no se modifica."""
        try:
            pedido = _obtener_pedido_editable(pedido_id)

            detalle = DetallePedido.query.filter_by(
                id=detalle_id, pedido_id=pedido_id
            ).first()
            if not detalle:
                return {'success': False, 'error': 'Detalle no encontrado'}, 404

            db.session.delete(detalle)
            db.session.flush()
            db.session.expire(pedido, ['detalles'])
            actualizar_total_pedido(pedido_id)
            db.session.commit()

            return {
                'success': True,
                'message': 'Producto quitado del pedido',
                'data':    pedido_schema.dump(pedido)
            }, 200

        except SQLAlchemyError as e:
            db.session.rollback()
            return {'success': False, 'error': str(e)}, 500


class DetallePedidoResource(Resource):

    @jwt_required()
    @manejar_reglas
    def post(self, pedido_id):
        try:
            pedido = _obtener_pedido_editable(pedido_id)

            data = request.get_json() or {}

            combo_id   = data.get('combo_id')
            producto_id = data.get('producto_id')
            cantidad   = data.get('cantidad')

            if not cantidad:
                return {'success': False, 'error': 'Faltan datos requeridos: cantidad'}, 400

            cantidad = int(cantidad)

            if combo_id:
                combo = Combo.query.get(combo_id)
                if not combo:
                    return {'success': False, 'error': 'Combo no existe'}, 404
                if not combo.activo:
                    return {'success': False, 'error': f'El combo "{combo.nombre}" no está activo'}, 400

                precio_unitario = float(data.get('precio_unitario', combo.precio))

                detalle = DetallePedido(
                    pedido_id       = pedido_id,
                    combo_id        = combo_id,
                    producto_id     = None,
                    tamano_id       = data.get('tamano_id'),
                    cantidad        = cantidad,
                    precio_unitario = precio_unitario,
                    notas           = data.get('notas') or None,
                )
                db.session.add(detalle)
                db.session.flush()

                actualizar_total_pedido(pedido_id)
                db.session.commit()

                return {
                    'success': True,
                    'message': f'Combo "{combo.nombre}" agregado al pedido',
                    'data':    detalle_schema.dump(detalle)
                }, 201

            if not producto_id:
                return {'success': False, 'error': 'Faltan datos requeridos: producto_id o combo_id'}, 400

            producto = Producto.query.get(producto_id)
            if not producto:
                return {'success': False, 'error': 'Producto no existe'}, 404

            tamano_id = data.get('tamano_id')

            # El stock se valida aquí (contando lo que ya hay en el pedido) pero se descuenta
            # recién al cobrar: un borrador que se abandona no consume bebidas.
            if producto.categoria.nombre.lower() == 'bebidas':
                disponible = producto.stock or 0
                if disponible <= 0:
                    return {'success': False, 'error': f'"{producto.nombre}" está agotado'}, 400
                ya_en_pedido = servicio.cantidades_de_bebidas(pedido).get(producto.id, 0)
                if disponible < ya_en_pedido + cantidad:
                    return {
                        'success': False,
                        'error': f'Stock insuficiente para "{producto.nombre}". '
                                 f'Disponible: {disponible}, en el pedido: {ya_en_pedido}, '
                                 f'solicitado: {cantidad}'
                    }, 400

            if tamano_id:
                if not Tamano.query.get(tamano_id):
                    return {'success': False, 'error': 'Tamaño no existe'}, 404

            precio_unitario = float(data.get('precio_unitario', producto.precio_base))

            detalle = DetallePedido(
                pedido_id       = pedido_id,
                producto_id     = producto_id,
                tamano_id       = tamano_id,
                cantidad        = cantidad,
                precio_unitario = precio_unitario,
                notas           = data.get('notas') or None,
            )
            db.session.add(detalle)
            db.session.flush()

            actualizar_total_pedido(pedido_id)
            db.session.commit()

            return {
                'success': True,
                'message': 'Producto agregado al pedido',
                'data':    detalle_schema.dump(detalle)
            }, 201

        except SQLAlchemyError as e:
            db.session.rollback()
            return {'success': False, 'error': str(e)}, 500
api.add_resource(PedidoListResource,
    '/api/v1.0/pedidos',
    endpoint='pedidos')

api.add_resource(PedidoDetailResource,
    '/api/v1.0/pedidos/<int:pedido_id>',
    endpoint='pedido_detail')

api.add_resource(PedidoCobrarResource,
    '/api/v1.0/pedidos/<int:pedido_id>/cobrar',
    endpoint='pedido_cobrar')

api.add_resource(DetallePedidoResource,
    '/api/v1.0/pedidos/<int:pedido_id>/detalles',
    endpoint='pedido_detalles')

api.add_resource(DetallePedidoItemResource,
    '/api/v1.0/pedidos/<int:pedido_id>/detalles/<int:detalle_id>',
    endpoint='pedido_detalle_item')

api.add_resource(DetalleMitadResource,
    '/api/v1.0/pedidos/<int:pedido_id>/detalles/mitad',
    endpoint='pedido_mitad')

api.add_resource(DetalleExtrasResource,
    '/api/v1.0/pedidos/<int:pedido_id>/detalles/<int:detalle_id>/extras',
    '/api/v1.0/pedidos/<int:pedido_id>/detalles/<int:detalle_id>/extras/<int:extra_id>',
    endpoint='pedido_extras')

api.add_resource(PedidoEstadoResource,
    '/api/v1.0/pedidos/<int:pedido_id>/estado',
    endpoint='pedido_estado')
