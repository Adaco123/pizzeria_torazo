from flask import Blueprint, request
from flask_restful import Api, Resource
from flask_jwt_extended import jwt_required
from marshmallow import ValidationError

from app.db import db
from ..models import Tamano
from .schemas import TamanoSchema

tamanos_v1_0_bp = Blueprint('tamanos_v1_0_bp', __name__)
api = Api(tamanos_v1_0_bp)

tamano_schema = TamanoSchema()
tamanos_schema = TamanoSchema(many=True)

# Tamanos base del sistema (el orden fija el id autoincremental)
TAMANOS_POR_DEFECTO = ["Personal", "Mediana", "Familiar", "Grande"]


def _asegurar_tamanos_por_defecto():
    hay_nuevos = False
    for nombre in TAMANOS_POR_DEFECTO:
        if not Tamano.query.filter_by(nombre=nombre).first():
            db.session.add(Tamano(nombre=nombre))
            hay_nuevos = True
    if hay_nuevos:
        db.session.commit()



class TamanosListResource(Resource):
    @jwt_required()
    def get(self):
        """List all sizes"""
        _asegurar_tamanos_por_defecto()
        tamanos = Tamano.query.all()
        return tamanos_schema.dump(tamanos), 200

    @jwt_required()
    def post(self):
        """Create a new size"""
        try:
            data = tamano_schema.load(request.get_json())
        except ValidationError as error:
            return error.messages, 400

        tamano = Tamano(**data)
        tamano.save()
        return tamano_schema.dump(tamano), 201


class TamanoResource(Resource):
    @jwt_required()
    def get(self, tamano_id):
        """Get a specific size"""
        tamano = Tamano.query.get_or_404(tamano_id)
        return tamano_schema.dump(tamano), 200

    @jwt_required()
    def put(self, tamano_id):
        """Update a size"""
        tamano = Tamano.query.get_or_404(tamano_id)
        schema = TamanoSchema(excluir_id=tamano_id)
        try:
            data = schema.load(request.get_json(), partial=True)
        except ValidationError as error:
            return error.messages, 400

        for key, value in data.items():
            setattr(tamano, key, value)
        tamano.save()
        return tamano_schema.dump(tamano), 200

    @jwt_required()
    def delete(self, tamano_id):
        """Delete a size"""
        tamano = Tamano.query.get_or_404(tamano_id)
        tamano.delete()
        return '', 204


api.add_resource(TamanosListResource, '/api/v1.0/tamanos/', endpoint='tamanos_list')
api.add_resource(TamanoResource, '/api/v1.0/tamanos/<int:tamano_id>', endpoint='tamano_detail')