from werkzeug.exceptions import HTTPException

import os
from flask import Flask, jsonify
from flask_restful import Api
from flask_jwt_extended import JWTManager
from app.common.error_handling import ObjectNotFound, AppErrorBaseClass
from app.db import db
from app.users.models import Usuario
from app.users.api_v1_0.resources import usuarios_v1_0_bp
from app.factura.api_v1_0.resources import facturas_v1_0_bp
from app.clientes.api_v1_0.resources import clientes_v1_0_bp
from app.combos.api_v1_0.resources import combos_v1_0_bp
from app.ingredientes.api_v1_0.resources import ingredientes_v1_0_bp
from app.pagos.api_v1_0.resources import pagos_v1_0_bp
from app.pedidos.api_v1_0.resources import pedidos_v1_0_bp
from app.productos.api_v1_0.resources import productos_v1_0_bp
from app.tamanos.api_v1_0.resources import tamanos_v1_0_bp
from app.admin.api_v1_0.resources import admin_v1_0_bp
from app.turnos.api_v1_0.resources import turnos_v1_0_bp
from app.pedidos.api_v1_0.ticket_cocina import ticket_cocina_bp
from app.movimientos.api_v1_0.resources import movimientos_v1_0_bp
from app.turnos.api_v1_0.resumen_turno_pdf import resumen_turno_pdf_bp
from .ext import ma, migrate
from flask_cors import CORS
from app.ia_telefono.webhook import ia_telefono_bp
jwt=JWTManager()

def create_app(settings_module):
    app = Flask(__name__)
    app.config.from_object(settings_module)
    app.config["JWT_SECRET_KEY"] = app.config.get("SECRET_KEY") or os.environ.get("JWT_SECRET_KEY", "1a2v")
    app.config["JWT_TOKEN_LOCATION"] = ["headers"]

    cors_origins = app.config.get("CORS_ORIGINS", "")
    allowed_origins = [origin.strip() for origin in cors_origins.split(",") if origin.strip()]
    if not allowed_origins:
        allowed_origins = [
            "http://localhost:5173",
            "http://localhost:3000",
            "https://balanced-contentment-production-b0f7.up.railway.app",
        ]

    CORS(app, resources={r"/api/*": {
        "origins": allowed_origins,
        "methods": ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
    }})
    jwt.init_app(app)  
    db.init_app(app)
    ma.init_app(app)
    migrate.init_app(app, db)

    app.url_map.strict_slashes = False


    @jwt.user_lookup_loader
    def user_lookup_callback(_jwt_header, jwt_data):
        identity = jwt_data.get('sub') or jwt_data.get('identity')
        if not identity:
            return None
        try:
            identity = int(identity)
        except (TypeError, ValueError):
            pass
        return Usuario.query.get(identity)


    app.register_blueprint(usuarios_v1_0_bp)
    app.register_blueprint(facturas_v1_0_bp)
    app.register_blueprint(clientes_v1_0_bp)
    app.register_blueprint(combos_v1_0_bp)
    app.register_blueprint(ingredientes_v1_0_bp)
    app.register_blueprint(pagos_v1_0_bp)
    app.register_blueprint(pedidos_v1_0_bp)
    app.register_blueprint(productos_v1_0_bp)
    app.register_blueprint(tamanos_v1_0_bp)
    app.register_blueprint(turnos_v1_0_bp)
    app.register_blueprint(admin_v1_0_bp)
    app.register_blueprint(ticket_cocina_bp)
    app.register_blueprint(movimientos_v1_0_bp)
    app.register_blueprint(resumen_turno_pdf_bp)
    app.register_blueprint(ia_telefono_bp)
    register_error_handlers(app)

    return app


def register_error_handlers(app):
    @app.errorhandler(Exception)
    def handle_exception_error(e):
        if isinstance(e, HTTPException):
            return e
        app.logger.exception("Error no controlado")
        return jsonify({'msg': 'Internal server error'}), 500
def register_error_handlers(app):
    @app.errorhandler(Exception)
    def handle_exception_error(e):
        return jsonify({'msg': 'Internal server error'}), 500

    @app.errorhandler(405)
    def handle_405_error(e):
        return jsonify({'msg': 'Method not allowed'}), 405

    @app.errorhandler(403)
    def handle_403_error(e):
        return jsonify({'msg': 'Forbidden error'}), 403

    @app.errorhandler(404)
    def handle_404_error(e):
        return jsonify({'msg': 'Not Found error'}), 404

    @app.errorhandler(AppErrorBaseClass)
    def handle_app_base_error(e):
        return jsonify({'msg': str(e)}), 500

    @app.errorhandler(ObjectNotFound)
    def handle_object_not_found_error(e):
        return jsonify({'msg': str(e)}), 404