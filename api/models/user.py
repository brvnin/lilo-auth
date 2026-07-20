from datetime import datetime, timezone
from api.extensions import db

class User(db.Model):
    __table_args__ = {'schema': 'api'}
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False, index=True)
    email = db.Column(db.String(120), unique=True, nullable=True, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    hwid = db.Column(db.String(255), nullable=True, index=True)
    hwid_encrypted = db.Column(db.Text, nullable=True)
    hwid_banned = db.Column(db.Boolean, default=False)
    subscription_type = db.Column(db.String(50), nullable=False, default='basic')  # Default subscription
    expiry_date = db.Column(db.DateTime, nullable=True)  # Global expiry (optional, for backward compatibility)
    is_active = db.Column(db.Boolean, default=True)
    is_banned = db.Column(db.Boolean, default=False)
    ban_reason = db.Column(db.String(255), nullable=True)
    hwid_resets = db.Column(db.Integer, default=0)
    last_login = db.Column(db.DateTime, nullable=True)
    last_ip = db.Column(db.String(45), nullable=True)
    last_validation = db.Column(db.DateTime, nullable=True)
    validation_count = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self, include_sensitive=False):
        data = {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'subscription_type': self.subscription_type,
            'expiry_date': self.expiry_date.isoformat() if self.expiry_date else 'lifetime',
            'is_active': self.is_active,
            'is_banned': self.is_banned,
            'hwid_banned': self.hwid_banned,
            'hwid': self.hwid,  # Add HWID to response
            'hwid_resets': self.hwid_resets,
            'last_login': self.last_login.isoformat() if self.last_login else None,
            'validation_count': self.validation_count,
            'created_at': self.created_at.isoformat()
        }
        if include_sensitive:
            data['last_ip'] = self.last_ip
            data['ban_reason'] = self.ban_reason
        return data

class SessionToken(db.Model):
    __table_args__ = {'schema': 'api'}
    __tablename__ = 'session_tokens'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), nullable=False, index=True)
    token_hash = db.Column(db.String(255), nullable=False, unique=True, index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    expires_at = db.Column(db.DateTime, nullable=False, index=True)
    revoked = db.Column(db.Boolean, default=False)
    last_used = db.Column(db.DateTime, default=datetime.utcnow)

class LoginAttempt(db.Model):
    __table_args__ = {'schema': 'api'}
    __tablename__ = 'login_attempts'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), nullable=False, index=True)
    ip_address = db.Column(db.String(45), nullable=False, index=True)
    success = db.Column(db.Boolean, default=False)
    failure_reason = db.Column(db.String(100), nullable=True)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow, index=True)

class ValidationLog(db.Model):
    __table_args__ = {'schema': 'api'}
    __tablename__ = 'validation_logs'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), nullable=False, index=True)
    ip_address = db.Column(db.String(45), nullable=False)
    success = db.Column(db.Boolean, default=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow, index=True)
