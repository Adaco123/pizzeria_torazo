from flask import Blueprint, request
from flask_jwt_extended import jwt_required
from flask_restful import Api, Resource

from app.gastos import servicio
from app.gastos.models import CATEGORIAS_GASTO, GastoCaja
from app.pedidos.servicio import ReglaNegocio, exigir_acceso_turno, manejar_reglas
from app.turnos.models import Turno

gastos_v1_0_bp = Blueprint('gastos_v1_0_bp', __name__)
api = Api(gastos_v1_0_bp)


class GastosDelTurnoResource(Resource):

    @jwt_required()
    @manejar_reglas
    def get(self, turno_id):
        """Gastos del turno. Los ve el administrador o el cajero dueño del turno."""
        turno = Turno.query.get(turno_id)
        if not turno:
            raise ReglaNegocio('Turno no encontrado', 404)
        exigir_acceso_turno(turno)
        gastos = sorted(turno.gastos, key=lambda g: g.fecha, reverse=True)
        return {
            'success': True,
            'data': {
                'gastos': [servicio.a_json(g) for g in gastos],
                'resumen': servicio.resumen_de_gastos(turno),
                'tope_cajero': servicio.TOPE_CAJERO_POR_TURNO,
                'categorias': [{'id': k, 'nombre': v} for k, v in CATEGORIAS_GASTO.items()],
            },
        }, 200

    @jwt_required()
    @manejar_reglas
    def post(self, turno_id):
        """JSON esperado: { "categoria": "insumos", "monto": 25.5, "descripcion": "Cebolla" }"""
        turno = Turno.query.get(turno_id)
        if not turno:
            raise ReglaNegocio('Turno no encontrado', 404)
        data = request.get_json() or {}
        gasto = servicio.registrar_gasto(turno, data.get('categoria'), data.get('monto'), data.get('descripcion'))
        return {'success': True, 'data': servicio.a_json(gasto)}, 201


class GastoAnularResource(Resource):

    @jwt_required()
    @manejar_reglas
    def patch(self, gasto_id):
        gasto = GastoCaja.query.get(gasto_id)
        if not gasto:
            raise ReglaNegocio('Gasto no encontrado', 404)
        servicio.anular_gasto(gasto)
        return {'success': True, 'data': servicio.a_json(gasto)}, 200


api.add_resource(GastosDelTurnoResource, '/api/v1.0/turnos/<int:turno_id>/gastos')
api.add_resource(GastoAnularResource, '/api/v1.0/gastos/<int:gasto_id>/anular')
