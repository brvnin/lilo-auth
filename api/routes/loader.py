from flask import Blueprint, request, jsonify
from api.extensions import db
from api.models import LoaderVersion, Product, Announcement, LoaderFeature, LoaderConfig
from api.utils.decorators import rate_limit
from api.utils.helpers import utc_now
from api.services.product import get_loader_product_full_info
import json

loader_bp = Blueprint('loader', __name__)

@loader_bp.route('/api/loader/check', methods=['POST'])
@rate_limit(limit=30, window=60)
def loader_check():
    """Main loader entry point - Returns all required info in one batch"""
    data = request.json
    loader_version = data.get('loader_version', '0.0.0')
    
    # 1. Check loader version
    current_loader = LoaderVersion.query.filter_by(is_current=True).first()
    required_loader = LoaderVersion.query.filter_by(is_required=True).first()
    
    needs_update = False
    force_update = False
    update_info = None
    
    if current_loader and loader_version < current_loader.version:
        needs_update = True
        update_info = current_loader.to_dict()
        
        if required_loader and loader_version < required_loader.version:
            force_update = True
    
    # 2. Get active products
    products = Product.query.filter_by(is_active=True).all()
    products_data = []
    
    for product in products:
        product_info = get_loader_product_full_info(product.id)
        if product_info:
            products_data.append(product_info)
    
    # Sort products by display_order
    products_data.sort(key=lambda x: x.get('details', {}).get('display_order', 999))
    
    # 3. Get active announcements
    now = utc_now()
    announcements = Announcement.query.filter(
        Announcement.is_active == True,
        db.or_(
            Announcement.expires_at == None,
            Announcement.expires_at > now
        )
    ).order_by(Announcement.priority.desc()).all()
    
    # 4. Get enabled features
    features = LoaderFeature.query.filter_by(is_enabled=True).order_by(LoaderFeature.display_order).all()
    
    # 5. Get global conig
    configs = LoaderConfig.query.all()
    config_dict = {cfg.key: cfg.to_dict()['value'] for cfg in configs}
    
    return jsonify({
        'success': True,
        'timestamp': utc_now().isoformat(),
        'loader': {
            'current_version': current_loader.version if current_loader else '1.0.0',
            'your_version': loader_version,
            'needs_update': needs_update,
            'force_update': force_update,
            'update_info': update_info
        },
        'products': products_data,
        'announcements': [a.to_dict() for a in announcements],
        'features': [f.to_dict() for f in features],
        'config': config_dict
    })

@loader_bp.route('/api/loader/version', methods=['GET'])
def get_loader_version():
    """Check loader version only"""
    current = LoaderVersion.query.filter_by(is_current=True).first()
    required = LoaderVersion.query.filter_by(is_required=True).first()
    
    return jsonify({
        'success': True,
        'current_version': current.version if current else '1.0.0',
        'minimum_version': required.version if required else '1.0.0',
        'download_url': current.download_url if current else '',
        'changelog': current.changelog if current else '',
        'file_size': current.file_size if current else 0,
        'file_hash': current.file_hash if current else ''
    })

@loader_bp.route('/api/loader/products', methods=['GET'])
def get_loader_products():
    """Get all products info"""
    products = Product.query.filter_by(is_active=True).all()
    products_data = []
    
    for product in products:
        product_info = get_loader_product_full_info(product.id)
        if product_info:
            products_data.append(product_info)
    
    products_data.sort(key=lambda x: x.get('details', {}).get('display_order', 999))
    
    return jsonify({
        'success': True,
        'products': products_data
    })

@loader_bp.route('/api/loader/product/<string:product_code>', methods=['GET'])
def get_loader_product(product_code):
    """Get single product info"""
    product = Product.query.filter_by(product_code=product_code).first()
    
    if not product:
        return jsonify({'error': 'Product not found'}), 404
    
    product_info = get_loader_product_full_info(product.id)
    
    return jsonify({
        'success': True,
        'product': product_info
    })

@loader_bp.route('/api/loader/announcements', methods=['GET'])
def get_loader_announcements():
    """Get active announcements"""
    now = utc_now()
    product_id = request.args.get('product_id', type=int)
    
    query = Announcement.query.filter(
        Announcement.is_active == True,
        db.or_(
            Announcement.expires_at == None,
            Announcement.expires_at > now
        )
    )
    
    announcements = query.order_by(Announcement.priority.desc()).all()
    
    if product_id:
        filtered = []
        for ann in announcements:
            if ann.target_products:
                targets = json.loads(ann.target_products)
                if product_id in targets:
                    filtered.append(ann)
            else:
                filtered.append(ann)
        announcements = filtered
    
    return jsonify({
        'success': True,
        'announcements': [a.to_dict() for a in announcements]
    })

@loader_bp.route('/api/loader/features', methods=['GET'])
def get_loader_features():
    """Get enabled features"""
    features = LoaderFeature.query.filter_by(is_enabled=True).order_by(LoaderFeature.display_order).all()
    
    return jsonify({
        'success': True,
        'features': [f.to_dict() for f in features]
    })

@loader_bp.route('/api/loader/config', methods=['GET'])
def get_loader_config():
    """Get loader configuration"""
    category = request.args.get('category')
    
    if category:
        configs = LoaderConfig.query.filter_by(category=category).all()
    else:
        configs = LoaderConfig.query.all()
    
    config_dict = {}
    for cfg in configs:
        cfg_data = cfg.to_dict()
        config_dict[cfg.key] = cfg_data['value']
    
    return jsonify({
        'success': True,
        'config': config_dict
    })

@loader_bp.route('/api/healthz', methods=['GET'])
def healthz_check():
    """Lightweight public endpoint for cronjobs and uptime monitors."""
    from datetime import datetime

    return jsonify({
        'status': 'ok',
        'service': 'loader-api',
        'timestamp': datetime.utcnow().isoformat()
    })


@loader_bp.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint for system status monitoring"""
    from datetime import datetime
    from api.models import User
    try:
        # Check database connection
        db.session.execute(db.text('SELECT 1'))
        
        # Get counts for diagnostics
        product_count = Product.query.count()
        user_count = User.query.count()
        
        return jsonify({
            'status': 'operational',
            'service': 'loader-api',
            'database': {
                'connected': True,
                'products': product_count,
                'users': user_count,
                'schema': 'api'
            },
            'timestamp': datetime.utcnow().isoformat()
        })
    except Exception as e:
        return jsonify({
            'status': 'down',
            'service': 'loader-api',
            'error': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }), 500
