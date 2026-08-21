import os
import secrets
from cryptography.fernet import Fernet

class Config:
    # Basic Config
    SECRET_KEY = os.environ.get('SECRET_KEY', secrets.token_hex(32))
    SESSION_SECRET = os.environ.get('SESSION_SECRET', secrets.token_hex(32))
    ENCRYPTION_KEY = os.environ.get('ENCRYPTION_KEY', Fernet.generate_key().decode())
    HMAC_SECRET = os.environ.get('HMAC_SECRET', 'MEU_SEGREDO_SUPER_SEGURO_2026')
    DRIVER_KEY_PART = os.environ.get('DRIVER_KEY_PART', '4B79A3F10E2D8C659B1A7E3F8C0D4E2A')
    MAX_CONTENT_LENGTH = 100 * 1024 * 1024  # 100MB limit
    
    # Upload Folder
    UPLOAD_FOLDER = 'uploads'
    
    # Admin credentials
    ADMIN_USERNAME = os.environ.get('ADMIN_USERNAME')
    ADMIN_PASSWORD_HASH = os.environ.get('ADMIN_PASSWORD_HASH')
    STORE_API_KEY = os.environ.get('STORE_API_KEY', secrets.token_hex(32))
    
    # Database
    database_url = os.environ.get('DATABASE_URL', 'sqlite:///auth.db')
    if database_url.startswith('postgres://'):
        database_url = database_url.replace('postgres://', 'postgresql://')
    
    SQLALCHEMY_DATABASE_URI = database_url
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_pre_ping': True,
        'pool_recycle': 300,
    }
    
    # CORS
    ALLOWED_ORIGINS = os.environ.get('ALLOWED_ORIGINS', '*').split(',')
