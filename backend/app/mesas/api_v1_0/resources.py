from flask import Blueprint, request
from flask_jwt_extended import jwt_required
from flask_restful import Api, Resource
from marshmallow import ValidationError
from sqlalchemy.exc import SQLAlchemyError

from app.db import db
from app.mesas import servicio
from app.mesas.models import CuentaMesa, Mesa
from app.pedidos import servicio as pedidos
from app.pedidos.api_v1_0.schemas import CobrarSchema, PedidoSchema
from app.pedidos.models import Pedido
from app.pedidos.servicio import ReglaNegocio, manejar_reglas
from app.users.models import ROL_ADMINISTRADOR

mesas_v1_0_bp = Blueprint('mesas_v1_0_bp', __name__)
api = Api(mesas_v1_0_bp)
pedido_schema = PedidoSchema()
cobrar_schema = CobrarSchema()


def _mesa(mesa_id):
    mesa = Mesa.query.get(mesa_id)
    if not mesa:
        raise ReglaNegocio('Mesa no encontrada', 404)
    return mesa


def _cuenta(cuenta_id):
    cuenta = CuentaMesa.query.get(cuenta_id)
    if not cuenta:
        raise ReglaNegocio('Cuenta no encontrada', 404)
    return cuenta


def _mesa_json(mesa):
    cuenta = servicio.cuenta_abierta_de(mesa)
    return {
        'id': mesa.id,
        'numero': mesa.numero,
        'activa': mesa.activa,
        'cuenta': servicio.resumen_de_cuenta(cuenta) if cuenta else None,
    }


def _cuenta_json(cuenta):
    data = servicio.resumen_de_cuenta(cuenta)
    data.update({
        'mesa_id': cuenta.mesa_id,
        'mesa_numero': cuenta.mesa.numero,
        'cerrada_en': cuenta.cerrada_en.isoformat() if cuenta.cerrada_en else None,
        'rondas_detalle': [pedido_schema.dump(p) for p in cuenta.pedidos
                           if pedidos.estado_de(p) != 'cancelado'],
        'rondas_canceladas': sum(1 for p in cuenta.pedidos if pedidos.estado_de(p) == 'cancelado'),
        'tope_descuento_cajero': pedidos.TOPE_DESCUENTO_CAJERO,
    })
    return data


class MesasResource(Resource):

    @jwt_required()
    @manejar_reglas
    def get(self):
        """Plano de mesas con la cuenta abierta de cada una. `?todas=1` (admin) incluye las desactivadas."""
        pedidos.exigir_rol(*servicio.ROLES_DE_SALA)
        consulta = Mesa.query
        if not (request.args.get('todas') and pedidos.es_admin()):
            consulta = consulta.filter(Mesa.activa.is_(True))
        if pedidos.es_admin():
            servicio.asegurar_rol_mesero()
        mesas = consulta.order_by(Mesa.numero).all()
        return {'success': True, 'data': [_mesa_json(m) for m in mesas]}, 200

    @jwt_required()
    @manejar_reglas
    def post(self):
        """JSON: { "numero": 5 } (solo administrador)."""
        pedidos.exigir_rol(ROL_ADMINISTRADOR)
        data = request.get_json() or {}
        mesa = Mesa(servicio.validar_numero(data.get('numero')))
        db.session.add(mesa)
        db.session.commit()
        return {'success': True, 'data': _mesa_json(mesa)}, 201


class MesaResource(Resource):

    @jwt_required()
    @manejar_reglas
    def put(self, mesa_id):
        """Cambia el número o activa/desactiva la mesa (solo administrador)."""
        pedidos.exigir_rol(ROL_ADMINISTRADOR)
        mesa = _mesa(mesa_id)
        data = request.get_json() or {}
        if 'numero' in data:
            mesa.numero = servicio.validar_numero(data['numero'], excepto_id=mesa.id)
        if 'activa' in data:
            if not isinstance(data['activa'], bool):
                raise ReglaNegocio('activa debe ser true o false', 400)
            if not data['activa'] and servicio.cuenta_abierta_de(mesa):
                raise ReglaNegocio('La mesa tiene una cuenta abierta: cóbrala antes de desactivarla', 409)
            mesa.activa = data['activa']
        db.session.commit()
        return {'success': True, 'data': _mesa_json(mesa)}, 200

    @jwt_required()
    @manejar_reglas
    def delete(self, mesa_id):
        pedidos.exigir_rol(ROL_ADMINISTRADOR)
        mesa = _mesa(mesa_id)
        if mesa.cuentas:
            raise ReglaNegocio('La mesa ya tiene historial: desactívala en lugar de borrarla', 409)
        db.session.delete(mesa)
        db.session.commit()
        return {'success': True, 'message': 'Mesa eliminada'}, 200


class MesaAbrirResource(Resource):

    @jwt_required()
    @manejar_reglas
    def post(self, mesa_id):
        cuenta = servicio.abrir_cuenta(_mesa(mesa_id))
        return {'success': True, 'data': _cuenta_json(cuenta)}, 201


class CuentaResource(Resource):

    @jwt_required()
    @manejar_reglas
    def get(self, cuenta_id):
        pedidos.exigir_rol(*servicio.ROLES_DE_SALA)
        return {'success': True, 'data': _cuenta_json(_cuenta(cuenta_id))}, 200


class CuentaRondasResource(Resource):

    @jwt_required()
    @manejar_reglas
    def post(self, cuenta_id):
        """Devuelve el borrador de ronda de esta cuenta (lo crea si no hay). Luego se agregan
        productos con los mismos endpoints de /pedidos/<id>/detalles."""
        ronda, creada = servicio.nueva_ronda(_cuenta(cuenta_id))
        return {'success': True, 'data': pedido_schema.dump(ronda)}, 201 if creada else 200


class CuentaPedirCuentaResource(Resource):

    @jwt_required()
    @manejar_reglas
    def post(self, cuenta_id):
        """JSON opcional: { "pidio": false } para quitar el aviso."""
        data = request.get_json(silent=True) or {}
        cuenta = servicio.pedir_cuenta(_cuenta(cuenta_id), data.get('pidio', True))
        return {'success': True, 'data': _cuenta_json(cuenta)}, 200


class CuentaCobrarResource(Resource):

    @jwt_required()
    @manejar_reglas
    def post(self, cuenta_id):
        """
        JSON: { "pagos": [{ "metodo_id": 1, "monto": 100, "monto_recibido": 120 }],
                "descuento": { "tipo": "porcentaje", "valor": 5, "motivo": "Cliente frecuente" } }
        La suma de pagos debe ser igual al total de la cuenta (con el descuento, si hay).
        """
        cuenta = _cuenta(cuenta_id)
        crudo = request.get_json() or {}
        try:
            datos = cobrar_schema.load(crudo)
        except ValidationError as err:
            return {'success': False, 'error': pedidos.primer_mensaje(err.messages)}, 400
        descuento = crudo.get('descuento')
        if descuento is not None and not isinstance(descuento, dict):
            raise ReglaNegocio('El descuento no tiene el formato correcto', 400)
        try:
            vuelto = servicio.cobrar_cuenta(cuenta, datos['pagos'], descuento)
        except SQLAlchemyError as e:
            db.session.rollback()
            return {'success': False, 'error': str(e)}, 500
        return {'success': True, 'message': f'Mesa {cuenta.mesa.numero} cobrada',
                'vuelto': vuelto, 'data': _cuenta_json(cuenta)}, 200


class CuentaAnularResource(Resource):

    @jwt_required()
    @manejar_reglas
    def post(self, cuenta_id):
        cuenta = servicio.anular_cuenta(_cuenta(cuenta_id))
        return {'success': True, 'data': _cuenta_json(cuenta)}, 200


class PedidoEnviarACocinaResource(Resource):

    @jwt_required()
    @manejar_reglas
    def post(self, pedido_id):
        pedido = Pedido.query.get(pedido_id)
        if not pedido:
            raise ReglaNegocio('Pedido no encontrado', 404)
        servicio.enviar_a_cocina(pedido)
        return {'success': True, 'message': f'Ronda enviada a cocina. Ficha {pedido.numero_turno}',
                'data': pedido_schema.dump(pedido)}, 200


api.add_resource(MesasResource, '/api/v1.0/mesas')
api.add_resource(MesaResource, '/api/v1.0/mesas/<int:mesa_id>')
api.add_resource(MesaAbrirResource, '/api/v1.0/mesas/<int:mesa_id>/abrir')
api.add_resource(CuentaResource, '/api/v1.0/cuentas-mesa/<int:cuenta_id>')
api.add_resource(CuentaRondasResource, '/api/v1.0/cuentas-mesa/<int:cuenta_id>/rondas')
api.add_resource(CuentaPedirCuentaResource, '/api/v1.0/cuentas-mesa/<int:cuenta_id>/pedir-cuenta')
api.add_resource(CuentaCobrarResource, '/api/v1.0/cuentas-mesa/<int:cuenta_id>/cobrar')
api.add_resource(CuentaAnularResource, '/api/v1.0/cuentas-mesa/<int:cuenta_id>/anular')
api.add_resource(PedidoEnviarACocinaResource, '/api/v1.0/pedidos/<int:pedido_id>/enviar-a-cocina')
