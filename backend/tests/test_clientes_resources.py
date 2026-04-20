from unittest.mock import patch

from app import create_app
import config.default as default_config


def test_post_missing_fields_returns_400():
    app = create_app(default_config)
    client = app.test_client()

    # Evita la verificación de JWT para pruebas simples
    with patch('flask_jwt_extended.view_decorators.verify_jwt_in_request', return_value=None):
        resp = client.post('/api/v1.0/clientes/', json={'nombre': 'Juan'})

    assert resp.status_code == 400
    data = resp.get_json()
    assert data.get('error') == 'Faltan datos requeridos'
