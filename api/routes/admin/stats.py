from flask import Blueprint, jsonify, request
from api.extensions import db
from api.models import User, Product, License, LoginAttempt, SubscriptionRenewal, UserProduct
from api.utils.decorators import require_admin_session
from api.utils.helpers import utc_now
from datetime import timedelta

stats_bp = Blueprint('admin_stats', __name__)

@stats_bp.route('/api/admin/stats', methods=['GET'])
@require_admin_session
def admin_stats():
    """Get system statistics"""
    total_users = User.query.count()
    active_users = User.query.filter_by(is_active=True).count()
    banned_users = User.query.filter_by(is_banned=True).count()
    total_licenses = License.query.count()
    used_licenses = License.query.filter_by(used=True).count()
    total_products = Product.query.count()
    active_products = Product.query.filter_by(is_active=True).count()
    
    recent_logins = LoginAttempt.query.filter(
        LoginAttempt.timestamp > utc_now() - timedelta(days=1)
    ).count()
    
    # Check for renewal table existence
    try:
        renewal_licenses = License.query.filter_by(is_renewal=True).count()
        total_renewals = SubscriptionRenewal.query.count()
    except Exception as e:
        print(f"Renewal table not found: {e}")
        renewal_licenses = 0
        total_renewals = 0
    
    # Product statistics
    product_stats = []
    for product in Product.query.all():
        product_licenses = License.query.filter_by(product_id=product.id).count()
        product_used = License.query.filter_by(product_id=product.id, used=True).count()
        product_users = UserProduct.query.filter_by(product_id=product.id, is_active=True).count()
        
        product_stats.append({
            'product_code': product.product_code,
            'product_name': product.product_name,
            'total_licenses': product_licenses,
            'used_licenses': product_used,
            'active_users': product_users
        })
    
    return jsonify({
        'users': {
            'total': total_users,
            'active': active_users,
            'banned': banned_users
        },
        'products': {
            'total': total_products,
            'active': active_products,
            'details': product_stats
        },
        'licenses': {
            'total': total_licenses,
            'used': used_licenses,
            'available': total_licenses - used_licenses,
            'renewals': renewal_licenses
        },
        'activity': {
            'logins_24h': recent_logins,
            'total_renewals': total_renewals
        }
    })

@stats_bp.route('/api/admin/renewals', methods=['GET'])
@require_admin_session
def admin_get_renewals():
    """Get all subscription renewals with filtering"""
    try:
        username = request.args.get('username')
        license_key = request.args.get('license_key')
        limit = int(request.args.get('limit', 100))
        
        query = SubscriptionRenewal.query
        
        if username:
            query = query.filter_by(username=username)
        
        if license_key:
            query = query.filter_by(license_key=license_key)
        
        renewals = query.order_by(SubscriptionRenewal.renewed_at.desc()).limit(limit).all()
        
        return jsonify({
            'total': len(renewals),
            'renewals': [renewal.to_dict() for renewal in renewals]
        })
    except Exception as e:
        print(f"Error loading renewals: {e}")
        return jsonify({
            'total': 0,
            'renewals': [],
            'error': 'Renewals table not initialized yet'
        })

@stats_bp.route('/api/admin/renewal_stats', methods=['GET'])
@require_admin_session
def admin_renewal_stats():
    """Get renewal statistics"""
    total_renewals = SubscriptionRenewal.query.count()
    
    # Renewals in last 7 days
    seven_days_ago = utc_now() - timedelta(days=7)
    recent_renewals = SubscriptionRenewal.query.filter(
        SubscriptionRenewal.renewed_at > seven_days_ago
    ).count()
    
    # Renewals in last 30 days
    thirty_days_ago = utc_now() - timedelta(days=30)
    monthly_renewals = SubscriptionRenewal.query.filter(
        SubscriptionRenewal.renewed_at > thirty_days_ago
    ).count()
    
    # Repeat renewers (users who renewed > 1 time)
    repeat_renewers = db.session.query(SubscriptionRenewal.username).group_by(
        SubscriptionRenewal.username
    ).having(db.func.count(SubscriptionRenewal.username) > 1).count()
    
    # Most popular subscription type
    popular_sub = db.session.query(
        SubscriptionRenewal.new_subscription_type,
        db.func.count(SubscriptionRenewal.new_subscription_type).label('count')
    ).group_by(SubscriptionRenewal.new_subscription_type).order_by(
        db.desc('count')
    ).first()
    
    return jsonify({
        'total_renewals': total_renewals,
        'recent_renewals': {
            'last_7_days': recent_renewals,
            'last_30_days': monthly_renewals
        },
        'repeat_renewers': repeat_renewers,
        'most_popular_subscription': {
            'type': popular_sub[0] if popular_sub else None,
            'count': popular_sub[1] if popular_sub else 0
        }
    })
