import os
import secrets
from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS
from api.config import Config
from api.extensions import db, limiter
from api.routes import register_routes
from api.utils.migrations import migrate_database
from api.utils.decorators import enforce_loader_security
from api.services.validation import cleanup_expired_sessions

# Path to the built admin panel (copied here by nixpacks build step)
ADMIN_STATIC_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static', 'admin')

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)
    
    # Initialize extensions
    db.init_app(app)
    limiter.init_app(app)
    CORS(app, resources={r"/api/*": {"origins": app.config['ALLOWED_ORIGINS']}})
    
    # Register Blueprints
    register_routes(app)
    
    # Serve Admin Panel static assets (js/css/images)
    @app.route('/admin/assets/<path:filename>')
    def admin_assets(filename):
        return send_from_directory(os.path.join(ADMIN_STATIC_DIR, 'assets'), filename)

    # SPA catch-all: anything under /admin/* returns index.html
    @app.route('/admin/', defaults={'path': ''})
    @app.route('/admin/<path:path>')
    def serve_admin(path):
        index_path = os.path.join(ADMIN_STATIC_DIR, 'index.html')
        if os.path.exists(index_path):
            return send_from_directory(ADMIN_STATIC_DIR, 'index.html')
        return jsonify({'error': 'Admin panel not built'}), 404

    # Before Request Hook
    @app.before_request
    def before_request():
        return enforce_loader_security()
    
    # Error Handlers
    @app.errorhandler(404)
    def not_found(e):
        return jsonify({'error': 'Endpoint not found'}), 404
    
    @app.errorhandler(429)
    def rate_limit_exceeded(e):
        return jsonify({'error': 'Rate limit exceeded', 'message': str(e.description)}), 429
    
    @app.errorhandler(500)
    def internal_error(e):
        return jsonify({'error': 'Internal server error'}), 500
    
    # Initialize DB and Migrations within context
    with app.app_context():
        # Create 'api' schema if using PostgreSQL (or attach in SQLite)
        if db.engine.url.drivername.startswith('sqlite'):
            try:
                db.session.execute(db.text("ATTACH DATABASE 'auth.db' AS api"))
                db.session.commit()
            except Exception:
                db.session.rollback()
        else:
            try:
                db.session.execute(db.text('CREATE SCHEMA IF NOT EXISTS api'))
                db.session.commit()
            except Exception:
                db.session.rollback()

        # Create tables if not exist
        db.create_all()
        
        # Run migrations
        migrate_database(app)
        
        # Cleanup
        try:
           cleanup_expired_sessions()
        except Exception as e:
           print(f"Cleanup warning: {e}")
        
        print("=" * 60)
        print("LILO AUTH v3.1.0 - INITIALIZED (MODULAR)")
        print("=" * 60)
        print(f"Database initialized")
        print(f"Admin Username: {app.config['ADMIN_USERNAME']}")
        print(f"ADMIN LOGIN: /admin/login")
        print("=" * 60)
        
    return app

app = create_app()

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)