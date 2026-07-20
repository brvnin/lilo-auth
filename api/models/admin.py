from datetime import datetime
import json
from api.extensions import db

class AdminSession(db.Model):
    __table_args__ = {'schema': 'api'}
    __tablename__ = 'admin_sessions'
    id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(db.String(255), unique=True, nullable=False, index=True)
    username = db.Column(db.String(80), nullable=False)
    ip_address = db.Column(db.String(45), nullable=False)
    user_agent = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    expires_at = db.Column(db.DateTime, nullable=False, index=True)
    last_activity = db.Column(db.DateTime, default=datetime.utcnow)
    revoked = db.Column(db.Boolean, default=False)

class CSRFToken(db.Model):
    __table_args__ = {'schema': 'api'}
    __tablename__ = 'csrf_tokens'
    id = db.Column(db.Integer, primary_key=True)
    token = db.Column(db.String(255), unique=True, nullable=False, index=True)
    session_id = db.Column(db.String(255), nullable=False, index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    expires_at = db.Column(db.DateTime, nullable=False)
    used = db.Column(db.Boolean, default=False)

class LoaderVersion(db.Model):
    __table_args__ = {'schema': 'api'}
    __tablename__ = 'loader_versions'
    id = db.Column(db.Integer, primary_key=True)
    version = db.Column(db.String(20), nullable=False, unique=True)  # مثل: "1.2.3"
    is_current = db.Column(db.Boolean, default=False)  # النسخة الحالية
    is_required = db.Column(db.Boolean, default=False)  # إجباري التحديث؟
    download_url = db.Column(db.String(500), nullable=False)  # رابط التحميل
    changelog = db.Column(db.Text, nullable=True)  # التحديثات الجديدة
    file_size = db.Column(db.Integer, nullable=True)  # حجم الملف بالـ bytes
    file_hash = db.Column(db.String(64), nullable=True)  # SHA256 hash للملف
    released_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'version': self.version,
            'is_current': self.is_current,
            'is_required': self.is_required,
            'download_url': self.download_url,
            'changelog': self.changelog,
            'file_size': self.file_size,
            'file_hash': self.file_hash,
            'released_at': self.released_at.isoformat()
        }

class Announcement(db.Model):
    __table_args__ = {'schema': 'api'}
    __tablename__ = 'announcements'
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    message = db.Column(db.Text, nullable=False)
    type = db.Column(db.String(50), default='info')  # info, warning, error, success, maintenance
    icon = db.Column(db.String(500), nullable=True)  # رابط أيقونة
    action_text = db.Column(db.String(100), nullable=True)  # نص الزر مثل: "Download Now"
    action_url = db.Column(db.String(500), nullable=True)  # رابط الزر
    is_active = db.Column(db.Boolean, default=True)
    is_dismissible = db.Column(db.Boolean, default=True)  # يمكن إغلاقه؟
    priority = db.Column(db.Integer, default=0)  # أعلى رقم = أولوية أعلى
    target_products = db.Column(db.Text, nullable=True)  # JSON list of product IDs (null = all)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    expires_at = db.Column(db.DateTime, nullable=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'message': self.message,
            'type': self.type,
            'icon': self.icon,
            'action_text': self.action_text,
            'action_url': self.action_url,
            'is_dismissible': self.is_dismissible,
            'priority': self.priority,
            'target_products': json.loads(self.target_products) if self.target_products else None,
            'created_at': self.created_at.isoformat(),
            'expires_at': self.expires_at.isoformat() if self.expires_at else None
        }

class LoaderConfig(db.Model):
    __table_args__ = {'schema': 'api'}
    __tablename__ = 'loader_config'
    id = db.Column(db.Integer, primary_key=True)
    key = db.Column(db.String(100), unique=True, nullable=False)
    value = db.Column(db.Text, nullable=False)
    value_type = db.Column(db.String(20), default='string')  # string, int, bool, json
    description = db.Column(db.String(255), nullable=True)
    category = db.Column(db.String(50), default='general')  # general, ui, security, features
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        value = self.value
        if self.value_type == 'int':
            value = int(value)
        elif self.value_type == 'bool':
            value = value.lower() in ['true', '1', 'yes']
        elif self.value_type == 'json':
            value = json.loads(value)
        
        return {
            'key': self.key,
            'value': value,
            'value_type': self.value_type,
            'description': self.description,
            'category': self.category,
            'updated_at': self.updated_at.isoformat()
        }

class LoaderFeature(db.Model):
    __table_args__ = {'schema': 'api'}
    __tablename__ = 'loader_features'
    id = db.Column(db.Integer, primary_key=True)
    feature_key = db.Column(db.String(100), unique=True, nullable=False)  # مثل: "auto_inject"
    feature_name = db.Column(db.String(100), nullable=False)  # مثل: "Auto Injection"
    is_enabled = db.Column(db.Boolean, default=True)
    is_premium = db.Column(db.Boolean, default=False)  # للـ premium users فقط؟
    description = db.Column(db.Text, nullable=True)
    config = db.Column(db.Text, nullable=True)  # JSON configuration
    icon = db.Column(db.String(500), nullable=True)
    display_order = db.Column(db.Integer, default=0)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'feature_key': self.feature_key,
            'feature_name': self.feature_name,
            'is_enabled': self.is_enabled,
            'is_premium': self.is_premium,
            'description': self.description,
            'config': json.loads(self.config) if self.config else {},
            'icon': self.icon,
            'display_order': self.display_order,
            'updated_at': self.updated_at.isoformat()
        }
