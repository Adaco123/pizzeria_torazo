from flask import Blueprint, request
from flask_restful import Api, Resource

from app.reportes.calculos import RangoInvalido, rango_de_fechas, reporte_de_ventas
from app.util.decorador_admin import admin_required

reportes_v1_0_bp = Blueprint('reportes_v1_0_bp', __name__)
api = Api(reportes_v1_0_bp)


class ReporteVentasResource(Resource):
    @admin_required
    def get(self):
        """Ventas del rango (horario de Bolivia): por día, producto y método de pago, más
        las cancelaciones. Parámetros: ?desde=AAAA-MM-DD&hasta=AAAA-MM-DD (por defecto, 7 días)."""
        try:
            inicio, fin = rango_de_fechas(request.args.get('desde'), request.args.get('hasta'))
        except RangoInvalido as error:
            return {'error': str(error)}, 400
        return reporte_de_ventas(inicio, fin), 200


api.add_resource(ReporteVentasResource, '/api/v1.0/reportes/ventas', endpoint='reporte_ventas')
