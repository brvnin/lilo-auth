from functools import wraps
from flask import request, jsonify
from api.config import Config
from api.services.security import custom_limiter
from api.services.validation import verify_loader_request, verify_admin_session, verify_csrf_token, verify_token
from api.models.user import User
import os

def rate_limit(limit: int, window: int, key_func=None):
    """
    Custom rate limit decorator
    limit: max requests
    window: time window in seconds
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # ✅ BYPASS LIMIT FOR LOADER (Signature already verified in before_request)
            if request.path.startswith('/api/') and not request.path.startswith('/api/admin'):
                 return f(*args, **kwargs)

            if key_func:
                key = key_func()
            else:
                key = f"ip:{request.remote_addr}"
            
            key = f"{key}:{request.endpoint}"
            
            allowed, retry_after = custom_limiter.is_allowed(key, limit, window)
            
            if not allowed:
                response = jsonify({
                    'error': 'Rate limit exceeded',
                    'message': f'Too many requests. Try again in {retry_after} seconds.',
                    'retry_after': retry_after
                })
                response.headers['Retry-After'] = str(retry_after)
                return response, 429
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator

def enforce_loader_security():
    """Ensure all client API requests come from the loader (for before_request)"""
    # Skip admin panel and static files
    if request.path.startswith('/api/admin') or request.path.startswith('/admin') or request.path == '/':
        return None
    
    # Skip public health endpoints used by uptime monitors and cronjobs
    if request.path in ('/api/health', '/api/healthz'):
        # Check for secret header from Store Backend
        health_secret = request.headers.get('X-Health-Secret')
        expected_secret = Config.HMAC_SECRET  # Use HMAC secret or separate env var if available
        # Fix: main.py used: app.config.get('HEALTH_CHECK_SECRET', os.environ.get('HEALTH_CHECK_SECRET', ''))
        # Using os.environ directly here
        expected_secret_env = os.environ.get('HEALTH_CHECK_SECRET', '')
        
        if expected_secret_env and health_secret == expected_secret_env:
            return None
        # If no secret configured, still allow (for Railway's internal healthcheck)
        if not expected_secret_env:
            return None
        # Block unauthorized access
        return jsonify({'error': 'Unauthorized', 'message': 'Health check requires authentication'}), 403
        
    # Only check /api/* routes
    if request.path.startswith('/api/'):
        if not request.path.startswith('/api/internal/'): # Allow internal endpoints to bypass loader security
            if not verify_loader_request():
                return jsonify({
                    'error': 'Unauthorized Client',
                    'message': 'This API can only be accessed via the official loader.'
                }), 403

def require_admin_session(f):
    """Require valid admin session (from HttpOnly cookie)"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        session_id = request.cookies.get('admin_session')
        
        if not session_id:
            return jsonify({'error': 'Unauthorized', 'redirect': '/admin/login'}), 401
        
        username, valid = verify_admin_session(session_id)
        
        if not valid:
            return jsonify({'error': 'Session expired', 'redirect': '/admin/login'}), 401
            
        # Attach username to request for use in routes
        request.admin_username = username
            
        return f(*args, **kwargs)
    return decorated_function

def require_csrf(f):
    """Require valid CSRF token in header"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        session_id = request.cookies.get('admin_session')
        csrf_token = request.headers.get('X-CSRF-Token')
        
        if not verify_csrf_token(session_id, csrf_token):
             return jsonify({'error': 'Invalid CSRF token'}), 403
             
        return f(*args, **kwargs)
    return decorated_function

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            if auth_header.startswith('Bearer '):
                token = auth_header.split(" ")[1]
        
        if not token:
            return jsonify({'message': 'Token is missing!'}), 401
        
        username, valid = verify_token(token)
        if not valid:
            return jsonify({'message': 'Token is invalid or expired!'}), 401
            
        current_user = User.query.filter_by(username=username).first()
        if not current_user:
            return jsonify({'message': 'User not found!'}), 401
            
        return f(current_user, *args, **kwargs)
    return decorated
