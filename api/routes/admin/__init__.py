from flask import Blueprint

admin_bp = Blueprint('admin', __name__)

from . import users
from . import products
from . import licenses
from . import system
from . import auth
from .system import system_bp
from .stats import stats_bp
from .bot import bot_bp
