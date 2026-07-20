from flask import request, jsonify
from api.extensions import db
from api.models import License, Product
from api.services.license import generate_product_license_key
from api.utils.decorators import require_admin_session, require_csrf
from api.extensions import limiter
from . import admin_bp

@admin_bp.route('/api/admin/licenses', methods=['GET'])
@require_admin_session
def admin_get_licenses():
    """Get all licenses"""
    show_used = request.args.get('show_used', 'true').lower() == 'true'
    
    if show_used:
        licenses = License.query.all()
    else:
        licenses = License.query.filter_by(used=False).all()
    
    return jsonify({
        'total': len(licenses),
        'licenses': [license.to_dict() for license in licenses]
    })

@admin_bp.route('/api/admin/generate_license', methods=['POST'])
@limiter.limit("10 per minute")
@require_admin_session
@require_csrf
def admin_generate_license():
    """Generate new license key"""
    data = request.json
    product_code = data.get('product_code', '').strip().upper()
    product_id = data.get('product_id')
    subscription_type = data.get('subscription_type', '').lower()
    quantity = int(data.get('quantity', 1))
    
    if (not product_code and not product_id) or not subscription_type:
        return jsonify({'error': 'Product code/id and subscription type are required'}), 400
    
    if product_id:
        product = Product.query.get(product_id)
    else:
        product = Product.query.filter_by(product_code=product_code).first()
        
    if not product:
        return jsonify({'error': 'Product not found'}), 404
    
    # Map subscription types to days
    duration_map = {
        'trial': 1,
        'day': 1,
        'week': 7,
        'weekly': 7,
        '15days': 15,
        'month': 30,
        'monthly': 30,
        'quarterly': 90,
        'yearly': 365,
        'lifetime': None
    }
    
    sub_type = subscription_type.lower()
    if sub_type not in duration_map:
        return jsonify({'error': f'Invalid subscription type: {subscription_type}'}), 400
    
    generated_licenses = []
    
    for _ in range(quantity):
        # Generate license key
        license_key = generate_product_license_key(product.product_code, sub_type)
        
        # Create license in database
        new_license = License(
            license_key=license_key,
            product_id=product.id,
            subscription_type=sub_type,
            duration_days=duration_map[sub_type],
            created_by_ip=request.remote_addr
        )
        db.session.add(new_license)
        generated_licenses.append(license_key)
        
    db.session.commit()
    
    return jsonify({
        'success': True,
        'licenses': generated_licenses,
        'count': quantity,
        'product': product.product_name,
        'product_code': product.product_code,
        'subscription_type': sub_type,
        'duration_days': duration_map[sub_type]
    }), 201

@admin_bp.route('/api/admin/delete_license', methods=['POST'])
@require_admin_session
@require_csrf
def admin_delete_license():
    """Delete license"""
    data = request.json
    license_key = data.get('license_key')
    force = data.get('force', False)
    
    if not license_key:
        return jsonify({'error': 'License key is required'}), 400
        
    license = License.query.filter_by(license_key=license_key).first_or_404()
    
    if license.used:
        if not force:
            return jsonify({'error': 'License is currently in use. Use force delete to proceed.'}), 400
            
        # If forced and used, revoke access
        if license.used_by:
            # Find user product
            from api.models import User, UserProduct, SessionToken
            user = User.query.filter_by(username=license.used_by).first()
            if user:
                user_product = UserProduct.query.filter_by(
                    user_id=user.id, 
                    product_id=license.product_id,
                    license_key_used=license.license_key
                ).first()
                
                if user_product:
                    user_product.is_active = False
                    # Revoke all sessions for this user
                    SessionToken.query.filter_by(username=user.username, revoked=False).update({'revoked': True})
    
    db.session.delete(license)
    db.session.commit()
    
    return jsonify({
        'success': True,
        'message': 'License deleted'
    })
