from app import create_app
from app.config import default
from app.users.models import Usuario, Role

app = create_app(default)
with app.app_context():
    roles = [r.nombre for r in Role.query.all()]
    cajeros = [(u.id, u.correo, u.activo, u.contra) for u in Usuario.query.join(Role).filter(Role.nombre=='cajero').all()]
    pizzeros = [(u.id, u.correo, u.activo, u.contra) for u in Usuario.query.join(Role).filter(Role.nombre=='pizzero').all()]
    print('Roles:', roles)
    print('Cajero users:', cajeros)
    print('Pizzero users:', pizzeros)
