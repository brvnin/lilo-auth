from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import MetaData
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

# Initialize extensions
# Initialize extensions
db = SQLAlchemy()

# Rate limiting
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["200 per day", "50 per hour"],
    storage_uri="memory://"
)
