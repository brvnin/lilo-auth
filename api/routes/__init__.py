from .auth import auth_bp
from .user import user_bp
from .loader import loader_bp
from .admin import admin_bp, system_bp, stats_bp, bot_bp
from .config import config_bp

from .internal import internal_bp

def register_routes(app):
    app.register_blueprint(auth_bp)
    app.register_blueprint(user_bp)
    app.register_blueprint(loader_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(system_bp, url_prefix='/api/admin')
    app.register_blueprint(stats_bp)
    app.register_blueprint(bot_bp, url_prefix='/api/admin/bot')
    app.register_blueprint(config_bp, url_prefix='/api/config')

    app.register_blueprint(internal_bp)
    
    from .uploads import uploads_bp
    app.register_blueprint(uploads_bp)
