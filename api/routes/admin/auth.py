from datetime import timedelta
from flask import request, jsonify, make_response, send_from_directory
from api.services.validation import create_admin_session, revoke_admin_session, verify_admin_session, generate_csrf_token
from api.models import AdminSession
from api.utils.decorators import require_admin_session
from api.extensions import limiter
from . import admin_bp
import os

@admin_bp.route('/admin/', defaults={'path': ''})
@admin_bp.route('/admin/<path:path>')
def serve_admin(path):
    """Serve the React Admin Panel"""
    # Calculate root directory relative to this file
    # File is at: /app/api/routes/admin/auth.py
    current_dir = os.path.dirname(os.path.abspath(__file__))
    root_dir = os.path.dirname(os.path.dirname(os.path.dirname(current_dir)))
    dist_dir = os.path.join(root_dir, 'admin-panel', 'dist')
    
    # Debug info
    full_path = os.path.join(dist_dir, path) if path else os.path.join(dist_dir, 'index.html')
    
    # If the path exists in dist (like assets/...), serve it
    if path != "" and os.path.exists(os.path.join(dist_dir, path)):
        return send_from_directory(dist_dir, path)
    
    # Otherwise serve index.html (for client-side routing)
    try:
        if os.path.exists(os.path.join(dist_dir, 'index.html')):
            return send_from_directory(dist_dir, 'index.html')
        else:
            raise FileNotFoundError(f"index.html not found in {dist_dir}")
    except Exception as e:
        # Diagnostic directory listing
        panel_exists = os.path.exists(os.path.join(root_dir, 'admin-panel'))
        panel_contents = os.listdir(os.path.join(root_dir, 'admin-panel')) if panel_exists else []
        
        return jsonify({
            'error': 'Admin panel build not found',
            'details': str(e),
            'looking_in': dist_dir,
            'cwd': os.getcwd(),
            'panel_folder_exists': panel_exists,
            'panel_folder_contents': panel_contents,
            'root_contents': os.listdir(root_dir)
        }), 404

@admin_bp.route('/api/admin/login', methods=['POST'])
@limiter.limit("5 per minute")
def admin_login():
    """Admin login"""
    data = request.json
    username = data.get('username')
    password = data.get('password')
    
    ADMIN_USERNAME = os.environ.get('ADMIN_USERNAME', 'admin')
    ADMIN_PASSWORD_HASH = os.environ.get('ADMIN_PASSWORD_HASH')
    from api.services.encryption import check_password
    
    if username == ADMIN_USERNAME and check_password(password, ADMIN_PASSWORD_HASH):
        session_id = create_admin_session(username, request.remote_addr, request.headers.get('User-Agent', ''))
        
        response = make_response(jsonify({'success': True, 'username': username}))
        
        # Set HttpOnly Secure Cookie
        is_production = os.environ.get('FLASK_ENV') == 'production'
        response.set_cookie(
            'admin_session', 
            session_id,
            httponly=True,
            secure=is_production,
            samesite='Strict',
            max_age=86400 # 24 hours
        )
        
        return response
    
    return jsonify({'error': 'Invalid credentials'}), 401

@admin_bp.route('/api/admin/logout', methods=['POST'])
def admin_logout():
    """Admin logout"""
    session_id = request.cookies.get('admin_session')
    revoke_admin_session(session_id)
    
    response = make_response(jsonify({'success': True, 'message': 'Logged out'}))
    response.set_cookie('admin_session', '', expires=0)
    
    return response

@admin_bp.route('/api/admin/verify', methods=['GET'])
@require_admin_session
def verify_admin():
    """Verify admin session is valid"""
    return jsonify({
        'valid': True,
        'username': request.admin_username
    })

@admin_bp.route('/api/admin/csrf', methods=['GET'])
@require_admin_session
def get_csrf_token():
    """Get a new CSRF token"""
    session_id = request.cookies.get('admin_session')
    csrf_token = generate_csrf_token(session_id)
    
    return jsonify({'csrf_token': csrf_token})

@admin_bp.route('/api/admin/stats', methods=['GET'])
@require_admin_session
def admin_get_stats():
    """Get system statistics"""
    from api.models import User, License, Product, UserProduct, SubscriptionRenewal
    from api.utils.helpers import utc_now
    
    total_users = User.query.count()
    active_users = User.query.filter_by(is_active=True).count()
    banned_users = User.query.filter_by(is_banned=True).count()
    
    total_licenses = License.query.count()
    used_licenses = License.query.filter_by(used=True).count()
    
    total_products = Product.query.count()
    active_products = Product.query.filter_by(is_active=True).count()
    
    # Calculate active subscriptions (roughly)
    active_subs = UserProduct.query.filter_by(is_active=True).count()
    
    return jsonify({
        'users': {
            'total': total_users,
            'active': active_users,
            'banned': banned_users,
            'online_24h': User.query.filter(User.last_login > utc_now() - timedelta(days=1)).count()
        },
        'licenses': {
            'total': total_licenses,
            'used': used_licenses,
            'available': total_licenses - used_licenses
        },
        'products': {
            'total': total_products,
            'active': active_products,
            'subscriptions': active_subs
        },
        'activity': {
            'total_renewals': SubscriptionRenewal.query.count()
        }
    })
