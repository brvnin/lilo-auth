from datetime import datetime
from api.extensions import db

class License(db.Model):
    __table_args__ = {'schema': 'api'}
    __tablename__ = 'licenses'
    id = db.Column(db.Integer, primary_key=True)
    license_key = db.Column(db.String(255), unique=True, nullable=False, index=True)
    product_id = db.Column(db.Integer, db.ForeignKey('api.products.id'), nullable=False, index=True)  # ← جديد
    subscription_type = db.Column(db.String(50), nullable=False)
    duration_days = db.Column(db.Integer, nullable=True)
    used = db.Column(db.Boolean, default=False)
    used_by = db.Column(db.String(80), nullable=True)
    used_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    created_by_ip = db.Column(db.String(45), nullable=True)
    is_renewal = db.Column(db.Boolean, default=False)
    
    product = db.relationship('Product', backref='licenses')
    
    def to_dict(self):
        return {
            'id': self.id,
            'license_key': self.license_key,
            'product': self.product.to_dict() if self.product else None,
            'product_id': self.product_id,
            'subscription_type': self.subscription_type,
            'duration_days': self.duration_days,
            'used': self.used,
            'used_by': self.used_by,
            'used_at': self.used_at.isoformat() if self.used_at else None,
            'created_at': self.created_at.isoformat(),
            'is_renewal': self.is_renewal
        }


class SubscriptionRenewal(db.Model):
    __table_args__ = {'schema': 'api'}
    __tablename__ = 'subscription_renewals'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), nullable=False, index=True)
    license_key = db.Column(db.String(255), nullable=False, index=True)
    product_id = db.Column(db.Integer, db.ForeignKey('api.products.id'), nullable=False)  # ← جديد
    old_subscription_type = db.Column(db.String(50), nullable=True)
    new_subscription_type = db.Column(db.String(50), nullable=False)
    old_expiry_date = db.Column(db.DateTime, nullable=True)
    new_expiry_date = db.Column(db.DateTime, nullable=True)
    days_added = db.Column(db.Integer, nullable=True)
    ip_address = db.Column(db.String(45), nullable=False)
    user_agent = db.Column(db.String(255), nullable=True)
    renewed_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    renewal_method = db.Column(db.String(50), nullable=False)  # 'self_service' or 'admin'
    is_new_subscription = db.Column(db.Boolean, default=False)  # True if user didn't have this product before
    
    product = db.relationship('Product')
    
    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'license_key': self.license_key,
            'product': self.product.to_dict() if self.product else None,
            'product_id': self.product_id,
            'old_subscription_type': self.old_subscription_type,
            'new_subscription_type': self.new_subscription_type,
            'old_expiry_date': self.old_expiry_date.isoformat() if self.old_expiry_date else None,
            'new_expiry_date': self.new_expiry_date.isoformat() if self.new_expiry_date else 'lifetime',
            'days_added': self.days_added,
            'ip_address': self.ip_address,
            'user_agent': self.user_agent,
            'renewed_at': self.renewed_at.isoformat(),
            'renewal_method': self.renewal_method,
            'is_new_subscription': self.is_new_subscription
        }
