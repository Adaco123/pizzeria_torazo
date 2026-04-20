import os
from dotenv import load_dotenv

# load environment variables from a .env file if present
load_dotenv()

from app import create_app

settings_module = os.getenv('APP_SETTINGS_MODULE', 'config.default')
app = create_app(settings_module)

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)