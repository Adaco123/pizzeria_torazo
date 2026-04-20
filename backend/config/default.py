import os
from datetime import timedelta

SECRET_KEY = '123447a47f563e90fe2db0f56b1b17be62378e31b7cfd3adc776c59ca4c75e2fc512c15f69bb38307d11d5d17a41a7936789'

PROPAGATE_EXCEPTIONS = True
SQLALCHEMY_DATABASE_URI = os.environ.get(
    'DATABASE_URL',
    'postgresql://postgres:adalid123@localhost:5432/pizzeria'
)
#postgresql://postgres:YAfcUgUAxhjovFuGwQIaTJZlkfMdloGu@postgres.railway.internal:5432/railway
##SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL', 'postgresql://postgres:adalid123@localhost:5432/pizzeria')
SQLALCHEMY_TRACK_MODIFICATIONS = False
SHOW_SQLALCHEMY_LOG_MESSAGES = False
ERROR_404_HELP = False
JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=2)
CORS_ORIGINS = os.environ.get(
    'CORS_ORIGINS',
    'http://localhost:5173,https://balanced-contentment-production-b0f7.up.railway.app'
)
