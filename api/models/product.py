from datetime import datetime, timezone
import json
from sqlalchemy.orm import deferred, backref
from api.extensions import db
from api.utils.helpers import utc_now

class Product(db.Model):
    __table_args__ = {'schema': 'api'}
    __tablename__ = 'products'
    id = db.Column(db.Integer, primary_key=True)
    product_code = db.Column(db.String(50), unique=True, nullable=False, index=True)  # مثل: VALORANT, PUBG, CSGO
    product_name = db.Column(db.String(100), nullable=False)  # Valorant Cheat
    description = db.Column(db.Text, nullable=True)
    is_active = db.Column(db.Boolean, default=True)
    icon_url = db.Column(db.String(255), nullable=True)
    file_path = db.Column(db.String(255), nullable=True)
    file_data = deferred(db.Column(db.LargeBinary, nullable=True))  # Deferred to save egress
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'product_code': self.product_code,
            'product_name': self.product_name,
            'description': self.description,
            'is_active': self.is_active,
            'icon_url': self.icon_url,
            'has_file': bool(self.file_path) or bool(self.file_data),
            'created_at': self.created_at.isoformat()
        }

class UserProduct(db.Model):
    __table_args__ = {'schema': 'api'}
    __tablename__ = 'user_products'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('api.users.id'), nullable=False, index=True)
    product_id = db.Column(db.Integer, db.ForeignKey('api.products.id'), nullable=False, index=True)
    subscription_type = db.Column(db.String(50), nullable=False)
    expiry_date = db.Column(db.DateTime, nullable=True)
    is_active = db.Column(db.Boolean, default=True)
    activated_at = db.Column(db.DateTime, default=datetime.utcnow)
    license_key_used = db.Column(db.String(255), nullable=False)
    # Fields for freezing time when product is disabled
    frozen_at = db.Column(db.DateTime, nullable=True)  # When product was disabled
    days_remaining_when_frozen = db.Column(db.Integer, nullable=True)  # Days remaining when frozen
    
    user = db.relationship('User', backref='user_products')
    product = db.relationship('Product', backref='user_products')
    
    # ✅ FIX BUG 2: Calculate real-time active status
    def is_subscription_active(self):
        if not self.is_active:
            return False
        
        # If frozen, it's considered active (paused) but not expired
        if self.frozen_at:
            return True
            
        if self.expiry_date:
            expiry = self.expiry_date
            if expiry.tzinfo is None:
                expiry = expiry.replace(tzinfo=timezone.utc)
            
            # Check if expired
            if utc_now() > expiry:
                return False  # Expired
        
        return True # Active or Lifetime

    def to_dict(self):
        from api.models.license import SubscriptionRenewal
        
        # Check if this was a new subscription (check if there's a renewal record with is_new_subscription=False)
        # If no renewal records exist OR all records have is_new_subscription=True, then this is a new subscription
        username = self.user.username if self.user else None
        is_new = True
        if username:
            # Check if there's any renewal for this user+product combination
            renewals = SubscriptionRenewal.query.filter_by(
                username=username,
                product_id=self.product_id
            ).all()
            
            if renewals:
                # If any renewal has is_new_subscription=False, then this product was renewed (not new)
                is_new = all(r.is_new_subscription for r in renewals)
            else:
                # No renewals found - check if this is the first activation
                # If activated_at is recent (within last hour), likely a new subscription
                if self.activated_at:
                    # Make activated_at timezone-aware if it's not
                    activated_at = self.activated_at
                    if activated_at.tzinfo is None:
                        activated_at = activated_at.replace(tzinfo=timezone.utc)
                    time_diff = (utc_now() - activated_at).total_seconds()
                    is_new = time_diff < 3600  # Less than 1 hour = likely new
                else:
                    is_new = True  # No activation date = new
        
        return {
            'id': self.id,
            'product': self.product.to_dict() if self.product else None,
            'subscription_type': self.subscription_type,
            'expiry_date': self.expiry_date.isoformat() if self.expiry_date else 'lifetime',
            'is_active': self.is_subscription_active(),  # ✅ Returned real-time status
            'is_active_db': self.is_active,  # ✅ Returned DB status for reference
            'is_frozen': bool(self.frozen_at),
            'activated_at': self.activated_at.isoformat(),
            'license_key_used': self.license_key_used,
            'is_new_subscription': is_new
        }

class ProductDetails(db.Model):
    __table_args__ = {'schema': 'api'}
    __tablename__ = 'product_details'
    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey('api.products.id'), nullable=False, unique=True)
    
    # Product Status
    status = db.Column(db.String(50), default='active')  # active, maintenance, disabled, unsafe
    status_message = db.Column(db.Text, nullable=True)  # رسالة تظهر للمستخدم
    
    # Product Version
    current_version = db.Column(db.String(20), default='1.0.0')
    last_update = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Security
    is_safe = db.Column(db.Boolean, default=True)  # المنتج آمن من الكشف؟
    last_detection = db.Column(db.DateTime, nullable=True)  # آخر كشف
    detection_status = db.Column(db.String(100), nullable=True)  # تفاصيل الكشف
    
    # Features
    features = db.Column(db.Text, nullable=True)  # JSON list of features
    supported_games = db.Column(db.Text, nullable=True)  # JSON list of game versions
    
    # Display
    display_order = db.Column(db.Integer, default=0)  # ترتيب العرض
    is_featured = db.Column(db.Boolean, default=False)  # منتج مميز؟
    badge_text = db.Column(db.String(50), nullable=True)  # مثل: "NEW", "UPDATED", "HOT"
    badge_color = db.Column(db.String(7), default='#FF0000')  # لون الشارة
    video_url = db.Column(db.String(500), nullable=True)  # Preview video URL (YouTube, etc)
    
    product = db.relationship('Product', backref=backref('details', uselist=False))
    
    def to_dict(self):
        return {
            'product_id': self.product_id,
            'status': self.status,
            'status_message': self.status_message,
            'current_version': self.current_version,
            'last_update': self.last_update.isoformat(),
            'is_safe': self.is_safe,
            'last_detection': self.last_detection.isoformat() if self.last_detection else None,
            'detection_status': self.detection_status,
            'features': self._safe_json_load(self.features),
            'supported_games': self._safe_json_load(self.supported_games),
            'display_order': self.display_order,
            'is_featured': self.is_featured,
            'badge_text': self.badge_text,
            'badge_color': self.badge_color,
            'video_url': self.video_url
        }

    def _safe_json_load(self, json_str):
        if not json_str:
            return []
        try:
            return json.loads(json_str)
        except Exception:
            return []

class ProductImage(db.Model):
    __table_args__ = {'schema': 'api'}
    __tablename__ = 'product_images'
    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey('api.products.id'), nullable=False)
    image_type = db.Column(db.String(50), nullable=False)  # icon, banner, screenshot, preview
    image_url = db.Column(db.String(500), nullable=False)
    display_order = db.Column(db.Integer, default=0)
    is_active = db.Column(db.Boolean, default=True)
    uploaded_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    product = db.relationship('Product', backref='images')
    
    def to_dict(self):
        return {
            'id': self.id,
            'product_id': self.product_id,
            'image_type': self.image_type,
            'image_url': self.image_url,
            'display_order': self.display_order,
            'uploaded_at': self.uploaded_at.isoformat()
        }
