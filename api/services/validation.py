from datetime import datetime, timedelta, timezone
import hashlib
import time
import secrets
import hmac
import jwt
from flask import request
from api.extensions import db
from api.config import Config
from api.models import (
    User, SessionToken, LoginAttempt, ValidationLog, 
    AdminSession, CSRFToken
)
from api.utils.helpers import utc_now

def verify_loader_request():
    """Verify request is coming from the loader using HMAC signature"""
    timestamp = request.headers.get('X-Loader-Timestamp')
    signature = request.headers.get('X-Loader-Signature')
    
    if not timestamp or not signature:
        print(f"DEBUG [LOADER_SECURITY]: Missing headers! (Timestamp={bool(timestamp)}, Signature={bool(signature)}) from IP={request.remote_addr}")
        return False
        
    # Verify timestamp (prevent replay attacks - 300s / 5min window)
    try:
        ts = float(timestamp)
        drift = abs(time.time() - ts)
        if drift > 300:
            print(f"DEBUG [LOADER_SECURITY]: Time drift too large ({drift:.1f}s > 300s). Server time={time.time()}, Client ts={ts}, IP={request.remote_addr}")
            return False
    except ValueError:
        print(f"DEBUG [LOADER_SECURITY]: Invalid timestamp '{timestamp}' from IP={request.remote_addr}")
        return False
        
    # Reconstruct signature
    # Payload = Timestamp + Method + Path + Body
    body = request.get_data(as_text=True) if request.data else ""
    payload = f"{timestamp}{request.method}{request.path}{body}"
    secret = Config.HMAC_SECRET.encode()
    
    expected_signature = hmac.new(
        secret, 
        payload.encode(), 
        hashlib.sha256
    ).hexdigest()
    
    if not hmac.compare_digest(signature, expected_signature):
        print(f"DEBUG [LOADER_SECURITY]: Signature mismatch from IP={request.remote_addr}!")
        print(f"DEBUG [LOADER_SECURITY]: Expected: {expected_signature}")
        print(f"DEBUG [LOADER_SECURITY]: Received: {signature}")
        print(f"DEBUG [LOADER_SECURITY]: Payload: '{payload}'")
        return False
        
    return True

def hash_hwid(hwid_data: str) -> str:
    """Hash HWID and format as HWID-XXXX-XXXX-XXXX-XXXX"""
    if not hwid_data:
        return None
    
    # If already formatted (from new loader), just validate and return
    if hwid_data.startswith("HWID-") and len(hwid_data) == 24:
        return hwid_data.upper()
    
    # Hash the raw fingerprint (for legacy loaders)
    full_hash = hashlib.sha256(hwid_data.encode()).hexdigest().upper()
    
    # Take first 16 chars and format
    short_hash = full_hash[:16]
    formatted = f"HWID-{short_hash[:4]}-{short_hash[4:8]}-{short_hash[8:12]}-{short_hash[12:16]}"
    
    return formatted

def verify_token(token: str) -> tuple:
    """Verify token and return (username, valid)"""
    try:
        token_hash = hashlib.sha256(token.encode()).hexdigest()
        print(f"DEBUG [VERIFY_TOKEN]: Looking up token_hash={token_hash[:16]}...")
        
        session = SessionToken.query.filter_by(token_hash=token_hash, revoked=False).first()
        
        if not session:
            # Check if token exists but is revoked
            revoked_session = SessionToken.query.filter_by(token_hash=token_hash, revoked=True).first()
            if revoked_session:
                print(f"DEBUG [VERIFY_TOKEN]: Token FOUND but REVOKED for user={revoked_session.username}")
            else:
                print(f"DEBUG [VERIFY_TOKEN]: Token NOT FOUND in database")
            return None, False
            
        print(f"DEBUG [VERIFY_TOKEN]: Token VALID for user={session.username}, revoked={session.revoked}")
        
        # aj3l expires_at timezone-aware
        expires_at = session.expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        
        if utc_now() > expires_at:
            session.revoked = True
            db.session.commit()
            print(f"DEBUG [VERIFY_TOKEN]: Token EXPIRED for user={session.username}")
            return None, False
        
        payload = jwt.decode(token, Config.SECRET_KEY, algorithms=['HS256'])
        username = payload['username']
        
        session.last_used = utc_now()
        db.session.commit()
        
        return username, True
    except Exception as e:
        print(f"DEBUG [VERIFY_TOKEN]: Exception: {e}")
        return None, False

def revoke_token(token: str):
    """Revoke a token"""
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    session = SessionToken.query.filter_by(token_hash=token_hash).first()
    if session:
        session.revoked = True
        db.session.commit()

def log_login_attempt(username: str, ip_address: str, success: bool, reason: str = None):
    """Log login attempt"""
    attempt = LoginAttempt(
        username=username,
        ip_address=ip_address,
        success=success,
        failure_reason=reason
    )
    db.session.add(attempt)
    db.session.commit()

def log_validation(username: str, ip_address: str, success: bool):
    """Log validation attempt"""
    log = ValidationLog(username=username, ip_address=ip_address, success=success)
    db.session.add(log)
    db.session.commit()

def check_suspicious_validation(username: str) -> bool:
    """Check for suspicious validation patterns"""
    five_mins_ago = utc_now() - timedelta(minutes=5)
    validation_count = ValidationLog.query.filter(
        ValidationLog.username == username,
        ValidationLog.timestamp > five_mins_ago
    ).count()
    return validation_count > 60

# Admin Session Helpers
def create_admin_session(username: str, ip_address: str, user_agent: str) -> str:
    """Create a new admin session"""
    session_id = secrets.token_urlsafe(32)
    
    admin_session = AdminSession(
        session_id=session_id,
        username=username,
        ip_address=ip_address,
        user_agent=user_agent,
        expires_at=utc_now() + timedelta(hours=24)
    )
    
    db.session.add(admin_session)
    db.session.commit()
    
    return session_id

def verify_admin_session(session_id: str) -> tuple:
    """Verify admin session and return (username, valid)"""
    if not session_id:
        return None, False
    
    session = AdminSession.query.filter_by(session_id=session_id, revoked=False).first()
    
    if not session:
        return None, False
    
    # aj3l session.expires_at timezone-aware
    expires_at = session.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    
    if utc_now() > expires_at:
        session.revoked = True
        db.session.commit()
        return None, False
    
    session.last_activity = utc_now()
    db.session.commit()
    
    return session.username, True

def revoke_admin_session(session_id: str):
    """Revoke an admin session"""
    session = AdminSession.query.filter_by(session_id=session_id).first()
    if session:
        session.revoked = True
        db.session.commit()

def generate_csrf_token(session_id: str) -> str:
    """Generate CSRF token for a session"""
    token = secrets.token_urlsafe(32)
    
    csrf = CSRFToken(
        token=token,
        session_id=session_id,
        expires_at=utc_now() + timedelta(hours=2)
    )
    
    db.session.add(csrf)
    db.session.commit()
    
    return token

def verify_csrf_token(session_id: str, token: str) -> bool:
    """Verify CSRF token"""
    if not token or not session_id:
        return False
    
    csrf = CSRFToken.query.filter_by(
        token=token,
        session_id=session_id,
        used=False
    ).first()
    
    if not csrf:
        return False
    
    # aj3l expires_at timezone-aware
    expires_at = csrf.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    
    if utc_now() > expires_at:
        return False
    
    csrf.used = True
    db.session.commit()
    
    return True

def create_session_token(username: str) -> str:
    """Generate JWT token and create session record"""
    payload = {
        'username': username,
        'exp': utc_now() + timedelta(hours=12),
        'iat': utc_now(),
        'jti': secrets.token_hex(16),
        'iss': 'auth-system'
    }
    
    # Generate JWT
    token = jwt.encode(payload, Config.SECRET_KEY, algorithm='HS256')
    
    # Store hash in DB
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    
    session = SessionToken(
        username=username,
        token_hash=token_hash,
        expires_at=payload['exp']
    )
    
    db.session.add(session)
    # Note: caller should commit, but to be safe and match legacy behavior which committed:
    db.session.commit()
    
    return token

def cleanup_expired_sessions():
    """Cleanup expired sessions"""
    AdminSession.query.filter(AdminSession.expires_at < utc_now()).delete()
    SessionToken.query.filter(SessionToken.expires_at < utc_now()).delete()
    CSRFToken.query.filter(CSRFToken.expires_at < utc_now()).delete()
    db.session.commit()
