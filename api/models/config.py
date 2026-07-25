from datetime import datetime
from api.extensions import db

class Config(db.Model):
    __table_args__ = {'schema': 'api'}
    __tablename__ = 'configs'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('api.users.id', ondelete='CASCADE'), nullable=False, index=True)
    name = db.Column(db.String(100), nullable=False)
    data = db.Column(db.Text, nullable=False)  # JSON string or encrypted text
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationship with User
    user = db.relationship('User', backref=db.backref('configs', lazy=True, cascade="all, delete"))
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'name': self.name,
            'data': self.data,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
