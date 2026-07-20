from flask import Blueprint, request, jsonify, current_app
from api.extensions import db
from api.models import Product, License
from api.services.license import generate_product_license_key

internal_bp = Blueprint('internal', __name__)

@internal_bp.route('/api/internal/generate_license', methods=['POST'])
def internal_generate_license():
    """Generate license key for Store after payment - requires Store API Key"""
    # Verify Store API Key
    api_key = request.headers.get('X-Store-API-Key')
    if not api_key or api_key != current_app.config['STORE_API_KEY']:
        return jsonify({'error': 'Unauthorized', 'message': 'Invalid Store API Key'}), 401
    
    data = request.json
    product_code = data.get('product_code', '').upper()  # e.g., "VALORANT", "DAYZ"
    subscription_type = data.get('subscription_type', 'monthly')  # weekly, monthly, lifetime, etc.
    
    if not product_code:
        return jsonify({'error': 'product_code is required'}), 400
    
    # Find product by code
    product = Product.query.filter_by(product_code=product_code).first()
    if not product:
        return jsonify({'error': f'Product not found: {product_code}'}), 404
    
    if not product.is_active:
        return jsonify({'error': 'Product is disabled'}), 400
    
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
    db.session.commit()
    
    return jsonify({
        'success': True,
        'license_key': license_key,
        'product': product.product_name,
        'product_code': product.product_code,
        'subscription_type': sub_type,
        'duration_days': duration_map[sub_type]
    }), 201
