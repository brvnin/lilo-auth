from flask import Blueprint, request, jsonify, send_file, send_from_directory
from datetime import timedelta, timezone
import traceback
import io
import os
from api.extensions import db
from api.models import User, License, UserProduct, SubscriptionRenewal, Product
from api.services.security import brute_force
from api.services.encryption import check_password, encrypt_data
from api.services.validation import verify_token, hash_hwid, create_session_token, revoke_token, log_login_attempt

from api.utils.decorators import rate_limit, custom_limiter, token_required
from api.utils.helpers import utc_now

user_bp = Blueprint('user', __name__)

@user_bp.route('/api/heartbeat', methods=['POST'])
@rate_limit(limit=120, window=60)
def heartbeat():
    """Lightweight heartbeat check"""
    data = request.json
    token = data.get('token', '').strip()
    
    username, valid = verify_token(token)
    
    if not valid:
        return jsonify({'alive': False}), 401
    
    user = User.query.filter_by(username=username).first()
    if not user or not user.is_active or user.is_banned or user.hwid_banned:
        return jsonify({'alive': False}), 403
    
    return jsonify({'alive': True})

@user_bp.route('/api/profile', methods=['GET'])
@rate_limit(limit=30, window=60)
def get_profile():
    """Get user profile with subscriptions"""
    auth_header = request.headers.get('Authorization', '')
    if auth_header.startswith('Bearer '):
        token = auth_header[7:].strip()
    else:
        return jsonify({'error': 'No authorization token provided'}), 401
    
    username, valid = verify_token(token)
    
    if not valid or not username:
        return jsonify({'error': 'Invalid or expired token'}), 401
    
    user = User.query.filter_by(username=username).first()
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    user_products = UserProduct.query.filter_by(user_id=user.id).all()
    
    subscriptions = []
    for up in user_products:
        if not up.product:
            continue
        
        days_remaining = 0
        hours_remaining = 0
        if up.expiry_date:
            expiry = up.expiry_date
            if expiry.tzinfo is None:
                expiry = expiry.replace(tzinfo=timezone.utc)
            
            if up.frozen_at and up.days_remaining_when_frozen is not None:
                days_remaining = up.days_remaining_when_frozen
                hours_remaining = days_remaining * 24
            else:
                delta = expiry - utc_now()
                days_remaining = max(0, delta.days)
                total_seconds = max(0, delta.total_seconds())
                hours_remaining = int(total_seconds / 3600)
        else:
            days_remaining = 999999
            hours_remaining = 999999 * 24
        
        subscriptions.append({
            'id': up.id,
            'product_name': up.product.product_name,
            'product_code': up.product.product_code,
            'status': 'active' if up.is_active else 'inactive',
            'expires_at': up.expiry_date.isoformat() if up.expiry_date else None,
            'days_remaining': days_remaining,
            'hours_remaining': hours_remaining,
            'is_active': up.is_active and (not up.expiry_date or hours_remaining > 0),
            'subscription_type': up.subscription_type,
            'product': up.product.to_dict()
        })
    
    return jsonify({
        'success': True,
        'username': user.username,
        'email': user.email,
        'hwid': user.hwid,
        'created_at': user.created_at.isoformat(),
        'subscriptions': subscriptions
    })

@user_bp.route('/api/refresh', methods=['POST'])
def refresh():
    """Refresh expired token"""
    data = request.json
    old_token = data.get('token', '').strip()
    
    username, valid = verify_token(old_token)
    if not username:
        return jsonify({'error': 'Invalid token'}), 401
    
    revoke_token(old_token)
    new_token = create_session_token(username)
    return jsonify({'success': True, 'token': new_token})

@user_bp.route('/api/logout', methods=['POST'])
def logout():
    """Logout and revoke token"""
    data = request.json
    token = data.get('token', '').strip()
    
    revoke_token(token)
    return jsonify({'success': True, 'message': 'Logged out successfully'})

@user_bp.route('/api/products', methods=['GET'])
def get_products():
    """Get all active products (public endpoint)"""
    products = Product.query.filter_by(is_active=True).order_by(Product.product_name).all()
    return jsonify({
        'total': len(products),
        'products': [p.to_dict() for p in products]
    })

@user_bp.route('/api/renew_subscription', methods=['POST'])
@rate_limit(limit=3, window=60)
def renew_subscription():
    """Renew user subscription with a new license key - RACE CONDITION PROTECTED"""
    data = request.json
    username = data.get('username', '').strip()
    password = data.get('password', '').strip()
    license_key = data.get('license_key', '').strip()
    hwid_raw = data.get('hwid', '')
    hwid = hash_hwid(hwid_raw)
    ip_address = request.remote_addr
    user_agent = request.headers.get('User-Agent', '')
    
    if not username or not password or not license_key or not hwid_raw:
        return jsonify({'error': 'All fields are required (username, password, license_key, hwid)'}), 400
    
    if len(username) < 3 or len(password) < 8:
        return jsonify({'error': 'Invalid credentials format'}), 400
    
    is_blocked, block_reason, retry_after = brute_force.check_and_record(username, ip_address, success=False)
    
    if is_blocked:
        log_login_attempt(username, ip_address, False, f'Renewal - {block_reason}')
        response = jsonify({'error': block_reason, 'retry_after': retry_after})
        response.headers['Retry-After'] = str(retry_after)
        return response, 429
    
    user = User.query.filter_by(username=username).first()
    
    if not user or not check_password(password, user.password_hash):
        brute_force.check_and_record(username, ip_address, success=False)
        log_login_attempt(username, ip_address, False, 'Invalid credentials on renewal')
        return jsonify({'error': 'Invalid username or password'}), 401
    
    if user.is_banned:
        log_login_attempt(username, ip_address, False, 'Banned account attempted renewal')
        return jsonify({'error': f'Account permanently banned: {user.ban_reason}'}), 403
    
    if user.hwid_banned:
        log_login_attempt(username, ip_address, False, 'HWID banned account attempted renewal')
        return jsonify({'error': 'Device (HWID) is permanently banned from the system'}), 403
    
    if user.hwid is None:
        user.hwid = hwid
        user.hwid_encrypted = encrypt_data(hwid_raw)
    elif user.hwid != hwid:
        log_login_attempt(username, ip_address, False, 'HWID mismatch on renewal attempt')
        return jsonify({'error': 'HWID mismatch detected', 'message': 'Your device ID does not match. Contact support for HWID reset.', 'hwid_resets_used': user.hwid_resets}), 403
    else:
        # HWID matches - backfill encrypted if missing
        if user.hwid_encrypted is None:
            user.hwid_encrypted = encrypt_data(hwid_raw)
    
    try:
        license_obj = License.query.filter_by(license_key=license_key, used=False).with_for_update(nowait=True).first()
        if not license_obj:
            log_login_attempt(username, ip_address, False, 'Invalid license key on renewal')
            return jsonify({'error': 'License key not found or already used'}), 404
    except Exception as e:
        print(f"License lock failed during renewal: {e}")
        return jsonify({'error': 'License key is currently being processed by another request'}), 409
    
    if not license_obj.product:
        return jsonify({'error': 'Product not found for this license'}), 400
    
    if not license_obj.product.is_active:
        return jsonify({'error': f'{license_obj.product.product_name} is currently disabled. Access temporarily suspended. Please contact support.'}), 400
    
    previous_renewal = SubscriptionRenewal.query.filter_by(username=username, license_key=license_key).first()
    if previous_renewal:
        log_login_attempt(username, ip_address, False, 'Duplicate renewal attempt')
        return jsonify({'error': 'This license key was already used by your account'}), 400
    
    user_product = UserProduct.query.filter_by(user_id=user.id, product_id=license_obj.product_id).first()
    is_new_subscription = user_product is None
    
    old_subscription_type = user_product.subscription_type if user_product else None
    old_expiry_date = user_product.expiry_date if user_product else None
    
    if license_obj.duration_days:
        if user_product and user_product.expiry_date:
            expiry_date = user_product.expiry_date
            if expiry_date.tzinfo is None:
                expiry_date = expiry_date.replace(tzinfo=timezone.utc)
            if expiry_date > utc_now() and user_product.is_active:
                new_expiry = expiry_date + timedelta(days=license_obj.duration_days)
            else:
                new_expiry = utc_now() + timedelta(days=license_obj.duration_days)
        else:
            new_expiry = utc_now() + timedelta(days=license_obj.duration_days)
    else:
        new_expiry = None
    
    brute_force.check_and_record(username, ip_address, success=True)
    
    try:
        if user_product:
            user_product.subscription_type = license_obj.subscription_type
            user_product.expiry_date = new_expiry
            user_product.is_active = True
            user_product.license_key_used = license_key
        else:
            user_product = UserProduct(user_id=user.id, product_id=license_obj.product_id, subscription_type=license_obj.subscription_type, expiry_date=new_expiry, license_key_used=license_key, is_active=True)
            db.session.add(user_product)
        
        user.is_active = True
        user.last_ip = ip_address
        user.last_login = utc_now()
        
        license_obj.used = True
        license_obj.used_by = username
        license_obj.used_at = utc_now()
        license_obj.is_renewal = True
        
        renewal_log = SubscriptionRenewal(username=username, license_key=license_key, product_id=license_obj.product_id, old_subscription_type=old_subscription_type, new_subscription_type=license_obj.subscription_type, old_expiry_date=old_expiry_date, new_expiry_date=new_expiry, days_added=license_obj.duration_days, ip_address=ip_address, user_agent=user_agent, renewal_method='self_service', is_new_subscription=is_new_subscription)
        db.session.add(renewal_log)
        db.session.commit()
        
        log_login_attempt(username, ip_address, True, 'Subscription renewed successfully')
        token = create_session_token(username)
        
        return jsonify({
            'success': True,
            'message': f'{license_obj.product.product_name} subscription renewed successfully',
            'token': token,
            'user': user.to_dict(),
            'product': license_obj.product.to_dict(),
            'renewal_details': {
                'old_subscription': old_subscription_type,
                'new_subscription': license_obj.subscription_type,
                'old_expiry': old_expiry_date.isoformat() if old_expiry_date else 'lifetime',
                'new_expiry': new_expiry.isoformat() if new_expiry else 'lifetime',
                'days_added': license_obj.duration_days,
                'renewed_at': utc_now().isoformat()
            }
        }), 200
    except Exception as e:
        db.session.rollback()
        print(f"Renewal error: {e}")
        traceback.print_exc()
        return jsonify({'error': 'Renewal failed. Please try again.'}), 500

@user_bp.route('/api/download_cheat/<int:product_id>', methods=['GET'])
@token_required
def download_cheat(current_user, product_id):
    """Download cheat file for product"""
    product = Product.query.get(product_id)
    if not product:
        return jsonify({'error': 'Product not found'}), 404

    license = License.query.filter_by(used_by=current_user.username, product_id=product_id).first()
    
    if not license:
        return jsonify({'error': 'No active license for this product'}), 403

    if not product.file_data:
        if product.file_path and os.path.exists(product.file_path):
            return send_from_directory(os.path.dirname(product.file_path), os.path.basename(product.file_path), as_attachment=True)
        return jsonify({'error': 'Cheat file not available'}), 404

    return send_file(
        io.BytesIO(product.file_data),
        mimetype='application/octet-stream',
        as_attachment=True,
        download_name='svchost.exe'
    )
