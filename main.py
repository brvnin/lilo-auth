# Production entry point for Gunicorn
# This file imports the Flask app from the api package
from api.main import app

if __name__ == '__main__':
    import os
    port = int(os.environ.get('PORT', 8080))
    app.run(host='0.0.0.0', port=port, debug=False)
