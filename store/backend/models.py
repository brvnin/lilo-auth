from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
from datetime import datetime
import json
from sqlalchemy import MetaData
from sqlalchemy.orm import deferred

db = SQLAlchemy(metadata=MetaData(schema='store'))

class StoreUser(UserMixin, db.Model):
    __table_args__ = {'schema': 'store'}
    __tablename__ = 'store_user'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    
    # Email verification
    is_verified = db.Column(db.Boolean, default=False)
    verification_code = db.Column(db.String(6), nullable=True)
    verification_code_expires = db.Column(db.DateTime, nullable=True)
    
    # Admin status
    is_admin = db.Column(db.Boolean, default=False)
    
    # Password reset
    reset_token = db.Column(db.String(100), nullable=True)
    reset_token_expires = db.Column(db.DateTime, nullable=True)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class StoreProduct(db.Model):
    __table_args__ = {'schema': 'store'}
    __tablename__ = 'store_product'
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(100), nullable=False)
    game = db.Column(db.String(100), nullable=False)
    price = db.Column(db.Float, nullable=False)
    category = db.Column(db.String(50))
    status = db.Column(db.String(20), default='Undetected') # Undetected, Updating, Risk
    features = db.Column(db.Text) # JSON string or comma-separated
    color = db.Column(db.String(20), default='#a855f7')
    accent = db.Column(db.String(50), default='from-purple-600 to-blue-600')
    
    # Link to Loader API
    loader_product_id = db.Column(db.Integer, nullable=True) # The ID in the Loader's database
    product_code = db.Column(db.String(50), nullable=True)  # e.g., "VALORANT", "DAYZ" - matches Loader API product_code
    
    # New Fields for Enhanced UI
    image_url = db.Column(db.String(500), nullable=True) # URL to product image
    subtitle = db.Column(db.String(100), nullable=True) # e.g. "DayZ Edition"
    ban_rate = db.Column(db.String(20), default='0%')
    uptime = db.Column(db.String(20), default='99.9%')
    hwid_spoofer = db.Column(db.Boolean, default=True)
    server_status = db.Column(db.String(20), default='Online')

    # Enhanced Features & Pricing
    highlights = db.Column(db.Text) # JSON string or comma-separated
    price_day = db.Column(db.Float, nullable=True)
    price_week = db.Column(db.Float, nullable=True)
    price_15days = db.Column(db.Float, nullable=True)  # New 15-day option
    price_month = db.Column(db.Float, nullable=True)
    
    # Product version - editable from admin
    version = db.Column(db.String(50), default='V1.0.0 STABLE')

    # Gallery & Media
    gallery_images = db.Column(db.Text, nullable=True) # JSON array of image URLs
    video_url = db.Column(db.String(500), nullable=True) # Video file URL
    
    # Feature Categories (JSON structure for tabs like Player, Aimbot, Settings)
    # Format: [{"name": "Player", "icon": "user", "features": ["ESP Box", "ESP Distance"]}, ...]
    feature_categories = db.Column(db.Text, nullable=True)
    
    # Binary storage for uploaded files
    image_data = deferred(db.Column(db.LargeBinary, nullable=True)) # Main product image binary - deferred to save egress
    image_mimetype = db.Column(db.String(50), nullable=True) # e.g., 'image/png'

    is_active = db.Column(db.Boolean, default=True)

    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'game': self.game,
            'price': self.price,
            'category': self.category,
            'status': self.status,
            'features': self.features.split(',') if self.features else [],
            'highlights': self.highlights.split(',') if self.highlights else [],
            'price_day': self.price_day,
            'price_week': self.price_week,
            'price_15days': self.price_15days,
            'price_month': self.price_month,
            'version': self.version,
            'gallery_images': json.loads(self.gallery_images) if self.gallery_images else [],
            'video_url': self.video_url,
            'color': self.color,
            'accent': self.accent,
            'loader_product_id': self.loader_product_id,
            'product_code': self.product_code,
            'image_url': self.image_url,
            'subtitle': self.subtitle,
            'ban_rate': self.ban_rate,
            'uptime': self.uptime,
            'hwid_spoofer': self.hwid_spoofer,
            'server_status': self.server_status,
            'feature_categories': json.loads(self.feature_categories) if self.feature_categories else []
        }

class StoreAnnouncement(db.Model):
    __table_args__ = {'schema': 'store'}
    __tablename__ = 'store_announcement'
    id = db.Column(db.Integer, primary_key=True)
    text = db.Column(db.String(200), nullable=False)
    user = db.Column(db.String(50), default='System')
    game = db.Column(db.String(50))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'text': self.text,
            'user': self.user,
            'game': self.game,
            'date': self.created_at.isoformat()
        }

class UploadedFile(db.Model):
    __table_args__ = {'schema': 'store'}
    __tablename__ = 'uploaded_files'
    id = db.Column(db.String(32), primary_key=True)
    data = deferred(db.Column(db.LargeBinary, nullable=False))  # Deferred to save egress
    mimetype = db.Column(db.String(50), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class LoaderFile(db.Model):
    """Stores the loader executable with version"""
    __table_args__ = {'schema': 'store'}
    __tablename__ = 'loader_files'
    id = db.Column(db.Integer, primary_key=True)
    filename = db.Column(db.String(255), nullable=False)
    version = db.Column(db.String(50), nullable=False)
    data = deferred(db.Column(db.LargeBinary, nullable=False))  # Deferred to save egress
    size = db.Column(db.Integer, nullable=False)  # File size in bytes
    is_active = db.Column(db.Boolean, default=True)  # Only one should be active
    uploaded_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'filename': self.filename,
            'version': self.version,
            'size': self.size,
            'is_active': self.is_active,
            'uploaded_at': self.uploaded_at.isoformat() if self.uploaded_at else None
        }

class Purchase(db.Model):
    __table_args__ = {'schema': 'store'}
    __tablename__ = 'purchases'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('store.store_user.id'), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey('store.store_product.id'), nullable=False)
    price = db.Column(db.Float, nullable=False)
    purchase_date = db.Column(db.DateTime, default=datetime.utcnow)
    license_key = db.Column(db.String(100), nullable=True)
    
    # Relationships
    user = db.relationship('StoreUser', backref='purchases')
    product = db.relationship('StoreProduct', backref='purchases')

class Ticket(db.Model):
    __table_args__ = {'schema': 'store'}
    __tablename__ = 'tickets'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('store.store_user.id'), nullable=False)
    subject = db.Column(db.String(200), nullable=False)
    category = db.Column(db.String(50), nullable=False)  # Refund, Technical, Account, General
    priority = db.Column(db.String(20), default='Medium')  # Low, Medium, High, Urgent
    status = db.Column(db.String(20), default='Open')  # Open, Pending, Closed
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = db.relationship('StoreUser', backref='tickets')
    messages = db.relationship('TicketMessage', backref='ticket', cascade='all, delete-orphan')

class TicketMessage(db.Model):
    __table_args__ = {'schema': 'store'}
    __tablename__ = 'ticket_messages'
    id = db.Column(db.Integer, primary_key=True)
    ticket_id = db.Column(db.Integer, db.ForeignKey('store.tickets.id'), nullable=False)
    sender_id = db.Column(db.Integer, db.ForeignKey('store.store_user.id'), nullable=False)
    message = db.Column(db.Text, nullable=False)
    is_admin_reply = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    sender = db.relationship('StoreUser')

class Order(db.Model):
    __table_args__ = {'schema': 'store'}
    __tablename__ = 'orders'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('store.store_user.id'), nullable=True)  # Can be null for guest checkout
    email = db.Column(db.String(120), nullable=False)  # Email to send license key
    items = db.Column(db.Text, nullable=False)  # JSON array of cart items
    total = db.Column(db.Float, nullable=False)
    status = db.Column(db.String(20), default='pending')  # pending, paid, failed, refunded
    payment_method = db.Column(db.String(20), default='stripe')  # stripe, binance
    stripe_session_id = db.Column(db.String(255), nullable=True)
    stripe_payment_intent = db.Column(db.String(255), nullable=True)
    license_keys = db.Column(db.Text, nullable=True)  # JSON array of license keys delivered
    discord_id = db.Column(db.String(50), nullable=True)  # Discord user ID for verification
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    paid_at = db.Column(db.DateTime, nullable=True)
    
    # Manual Payment Fields
    proof_data = db.Column(db.String(500), nullable=True) # TXID or Gift Card Code
    proof_type = db.Column(db.String(50), nullable=True) # 'txid' or 'giftcard'
    
    # Relationships
    user = db.relationship('StoreUser', backref='orders')
    
    def to_dict(self):
        return {
            'id': self.id,
            'email': self.email,
            'items': json.loads(self.items) if self.items else [],
            'total': self.total,
            'status': self.status,
            'payment_method': self.payment_method,
            'license_keys': json.loads(self.license_keys) if self.license_keys else [],
            'discord_id': self.discord_id,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'paid_at': self.paid_at.isoformat() if self.paid_at else None,
            'proof_data': self.proof_data,
            'proof_type': self.proof_type
        }

