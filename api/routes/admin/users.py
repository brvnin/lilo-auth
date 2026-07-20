from flask import request, jsonify
from datetime import timedelta, timezone
from api.extensions import db
from api.models import User, UserProduct, SubscriptionRenewal, SessionToken, LoginAttempt, ValidationLog, License
from api.services.encryption import hash_password
from api.utils.helpers import utc_now
from api.utils.decorators import require_admin_session, require_csrf, rate_limit
from . import admin_bp

@admin_bp.route('/api/admin/users', methods=['GET'])
@require_admin_session
def admin_get_users():
    """Get all users with detailed info and products"""
    username_filter = request.args.get('username')
    
    if username_filter:
        users = User.query.filter_by(username=username_filter).all()
    else:
        users = User.query.all()
    
    users_data = []
    for user in users:
        user_dict = user.to_dict(include_sensitive=True)
        # Add user products
        user_products = UserProduct.query.filter_by(user_id=user.id).all()
        user_dict['products'] = [up.to_dict() for up in user_products]
        users_data.append(user_dict)
    
    return jsonify({
        'total': len(users_data),
        'users': users_data
    })

@admin_bp.route('/api/admin/hwid_reset', methods=['POST'])
@rate_limit(limit=5, window=60)
@require_admin_session
@require_csrf
def admin_hwid_reset():
    """Reset user HWID"""
    data = request.json
    username = data.get('username')
    
    user = User.query.filter_by(username=username).first()
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    # DEBUG: Count active sessions BEFORE revoke
    active_sessions_before = SessionToken.query.filter_by(username=username, revoked=False).count()
    print(f"DEBUG [HWID_RESET]: User={username}, Active sessions BEFORE revoke: {active_sessions_before}")
    
    user.hwid = None
    user.hwid_encrypted = None
    user.hwid_resets += 1
    
    # 🔒 SECURITY FIX: Revoke all active sessions to force re-login/re-bind
    revoked_count = SessionToken.query.filter_by(username=username, revoked=False).update({'revoked': True})
    print(f"DEBUG [HWID_RESET]: Revoked {revoked_count} session(s) for user {username}")
    
    db.session.commit()
    
    # DEBUG: Count active sessions AFTER revoke
    active_sessions_after = SessionToken.query.filter_by(username=username, revoked=False).count()
    print(f"DEBUG [HWID_RESET]: Active sessions AFTER revoke: {active_sessions_after}")
    
    return jsonify({
        'success': True,
        'message': f'HWID reset for user {username}',
        'total_resets': user.hwid_resets,
        'sessions_revoked': revoked_count  # Include in response for debugging
    })

@admin_bp.route('/api/admin/toggle_user', methods=['POST'])
@require_admin_session
@require_csrf
def admin_toggle_user():
    """Enable/Disable user account"""
    data = request.json
    username = data.get('username')
    
    user = User.query.filter_by(username=username).first()
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    user.is_active = not user.is_active
    SessionToken.query.filter_by(username=username, revoked=False).update({'revoked': True})
    
    db.session.commit()
    
    return jsonify({
        'success': True,
        'username': username,
        'is_active': user.is_active
    })

@admin_bp.route('/api/admin/ban_user', methods=['POST'])
@require_admin_session
@require_csrf
def admin_ban_user():
    """Ban/Unban user"""
    data = request.json
    username = data.get('username')
    reason = data.get('reason', 'Violation of terms')
    
    user = User.query.filter_by(username=username).first()
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    user.is_banned = not user.is_banned
    user.ban_reason = reason if user.is_banned else None
    user.is_active = not user.is_banned
    
    SessionToken.query.filter_by(username=username, revoked=False).update({'revoked': True})
    
    db.session.commit()
    
    return jsonify({
        'success': True,
        'username': username,
        'is_banned': user.is_banned,
        'reason': user.ban_reason
    })

@admin_bp.route('/api/admin/delete_user', methods=['POST'])
@require_admin_session
@require_csrf
def admin_delete_user():
    """Delete user permanently"""
    data = request.json
    username = data.get('username')
    
    user = User.query.filter_by(username=username).first()
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    try:
        # Delete all related records first (in correct order to avoid foreign key violations)
        # 1. Delete UserProduct records (many-to-many relationship)
        UserProduct.query.filter_by(user_id=user.id).delete()
        
        # 2. Delete SubscriptionRenewal records
        SubscriptionRenewal.query.filter_by(username=username).delete()
        
        # 3. Delete session tokens
        SessionToken.query.filter_by(username=username).delete()
        
        # 4. Delete login attempts
        LoginAttempt.query.filter_by(username=username).delete()
        
        # 5. Delete validation logs
        ValidationLog.query.filter_by(username=username).delete()
        
        # 6. Update licenses to remove used_by reference
        License.query.filter_by(used_by=username).update({'used_by': None, 'used': False, 'used_at': None})
        
        # 7. Finally, delete the user
        db.session.delete(user)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f'User {username} deleted permanently'
        })
    except Exception as e:
        db.session.rollback()
        print(f"Error deleting user: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Failed to delete user: {str(e)}'}), 500

@admin_bp.route('/api/admin/edit_subscription', methods=['POST'])
@require_admin_session
@require_csrf
def admin_edit_subscription():
    """Edit user subscription type"""
    data = request.json
    username = data.get('username')
    new_sub_type = data.get('subscription_type')
    product_id = data.get('product_id')
    
    valid_types = ['trial', 'weekly', 'monthly', 'quarterly', 'yearly', 'lifetime']
    if new_sub_type not in valid_types:
        return jsonify({'error': 'Invalid subscription type'}), 400
    
    user = User.query.filter_by(username=username).first()
    if not user:
        return jsonify({'error': 'User not found'}), 404
        
    duration_map = {
        'trial': 1,
        'weekly': 7,
        'monthly': 30,
        'quarterly': 90,
        'yearly': 365,
        'lifetime': None
    }
    
    if product_id:
        # Update subscription for specific product
        user_product = UserProduct.query.filter_by(
            user_id=user.id,
            product_id=product_id
        ).first()
        
        if not user_product:
            return jsonify({'error': 'User does not have this product'}), 404
            
        user_product.subscription_type = new_sub_type
        
        # Also update expiry date if needed? 
        # Usually checking "edit sub" implicitly means setting it to the standard duration of that new type
        # But we should be careful not to override existing valid time unless intended.
        # For now, let's just update the type label as that's what the UI explicitly asks for.
        # If they want to extend, there's an "Extend" button.
        # However, switching from "Trial" to "Monthly" usually implies giving them a month.
        
        # Logic: If switching types, set new expiry from NOW.
        if duration_map[new_sub_type] is None:
            user_product.expiry_date = None # Lifetime
        else:
            user_product.expiry_date = utc_now() + timedelta(days=duration_map[new_sub_type])
            
        user_product.is_active = True
        
    else:
        # Fallback for global subscription
        user.subscription_type = new_sub_type
        if duration_map[new_sub_type] is None:
            user.expiry_date = None
        else:
            user.expiry_date = utc_now() + timedelta(days=duration_map[new_sub_type])
            
    db.session.commit()
    
    return jsonify({
        'success': True,
        'username': username,
        'new_subscription_type': new_sub_type,
        'product_id': product_id
    })

@admin_bp.route('/api/admin/extend_subscription', methods=['POST'])
@require_admin_session
@require_csrf
def admin_extend_subscription():
    """Extend user subscription time for specific product - WITH BUG FIX"""
    data = request.json
    username = data.get('username')
    days = data.get('days', 0)
    product_id = data.get('product_id')  # Optional: if not provided, extend all products
    
    if days <= 0:
        return jsonify({'error': 'Days must be positive'}), 400
    
    user = User.query.filter_by(username=username).first()
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    if product_id:
        # Extend specific product subscription
        user_product = UserProduct.query.filter_by(
            user_id=user.id,
            product_id=product_id
        ).first()
        
        if not user_product:
            return jsonify({'error': 'User does not have subscription for this product'}), 404
        
        if user_product.expiry_date is None:
            return jsonify({'error': 'User has lifetime subscription for this product'}), 400
        
        # Make expiry_date timezone-aware if needed
        expiry_date = user_product.expiry_date
        if expiry_date.tzinfo is None:
            expiry_date = expiry_date.replace(tzinfo=timezone.utc)
        
        if expiry_date > utc_now():
            user_product.expiry_date = expiry_date + timedelta(days=days)
        else:
            user_product.expiry_date = utc_now() + timedelta(days=days)
        
        # ✅ FIX BUG 1: Re-enable active status even if it was disabled/expired
        user_product.is_active = True
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'username': username,
            'product_id': product_id,
            'new_expiry': user_product.expiry_date.isoformat(),
            'days_added': days
        })
    else:
        # Extend all user products (backward compatibility)
        user_products = UserProduct.query.filter_by(user_id=user.id).all()
        if not user_products:
            # Fallback to old system
            if user.expiry_date is None:
                return jsonify({'error': 'User has lifetime subscription'}), 400
            
            expiry_date = user.expiry_date
            if expiry_date.tzinfo is None:
                expiry_date = expiry_date.replace(tzinfo=timezone.utc)
            
            if expiry_date > utc_now():
                user.expiry_date = expiry_date + timedelta(days=days)
            else:
                user.expiry_date = utc_now() + timedelta(days=days)
            
            db.session.commit()
            
            return jsonify({
                'success': True,
                'username': username,
                'new_expiry': user.expiry_date.isoformat(),
                'days_added': days,
                'note': 'Extended legacy subscription (no products found)'
            })
        
        extended_count = 0
        for up in user_products:
            if up.expiry_date is None:
                continue  # Skip lifetime subscriptions
            
            expiry_date = up.expiry_date
            if expiry_date.tzinfo is None:
                expiry_date = expiry_date.replace(tzinfo=timezone.utc)
            
            if expiry_date > utc_now():
                up.expiry_date = expiry_date + timedelta(days=days)
            else:
                up.expiry_date = utc_now() + timedelta(days=days)
                
            # ✅ FIX BUG 1: Re-enable active status for all extended products
            up.is_active = True
            
            extended_count += 1
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'username': username,
            'days_added': days,
            'products_extended': extended_count,
            'total_products': len(user_products)
        })

@admin_bp.route('/api/admin/hwid_ban', methods=['POST'])
@require_admin_session
@require_csrf
def admin_hwid_ban():
    """Ban/Unban user HWID"""
    data = request.json
    username = data.get('username')
    
    user = User.query.filter_by(username=username).first()
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    user.hwid_banned = not user.hwid_banned
    
    if user.hwid_banned:
        SessionToken.query.filter_by(username=username, revoked=False).update({'revoked': True})
    
    db.session.commit()
    
    return jsonify({
        'success': True,
        'username': username,
        'hwid_banned': user.hwid_banned
    })

@admin_bp.route('/api/admin/reset_password', methods=['POST'])
@require_admin_session
@require_csrf
def admin_reset_password():
    """Force reset user password"""
    data = request.json
    username = data.get('username')
    new_password = data.get('new_password', '').strip()
    
    if not new_password or len(new_password) < 8:
        return jsonify({'error': 'Password must be at least 8 characters'}), 400
    
    user = User.query.filter_by(username=username).first()
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    user.password_hash = hash_password(new_password)
    db.session.commit()
    
    return jsonify({
        'success': True,
        'message': f'Password reset for user {username}'
    })
