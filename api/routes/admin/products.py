from flask import request, jsonify, current_app, url_for
from werkzeug.utils import secure_filename
import os
from datetime import timedelta, timezone
import json
import gc
from api.extensions import db
from api.models import Product, UserProduct, ProductDetails, ProductImage, License
from api.utils.helpers import utc_now
from api.utils.decorators import require_admin_session, require_csrf, rate_limit
from . import admin_bp

@admin_bp.route('/api/admin/products', methods=['GET'])
@require_admin_session
def admin_get_products():
    """Get all products"""
    products = Product.query.order_by(Product.created_at.desc()).all()
    return jsonify({
        'total': len(products),
        'products': [p.to_dict() for p in products]
    })

@admin_bp.route('/api/admin/products/create', methods=['POST'])
@rate_limit(limit=10, window=60)
@require_admin_session
@require_csrf
def admin_create_product():
    """Create new product"""
    data = request.json
    product_code = data.get('product_code', '').strip().upper()
    product_name = data.get('product_name', '').strip()
    description = (data.get('description') or '').strip()
    icon_url = (data.get('icon_url') or '').strip()
    
    if not product_code or len(product_code) < 2 or len(product_code) > 20:
        return jsonify({'error': 'Product code must be 2-20 characters'}), 400
    
    if not product_name or len(product_name) < 3:
        return jsonify({'error': 'Product name must be at least 3 characters'}), 400
    
    if Product.query.filter_by(product_code=product_code).first():
        return jsonify({'error': 'Product code already exists'}), 400
    
    new_product = Product(
        product_code=product_code,
        product_name=product_name,
        description=description if description else None,
        icon_url=icon_url if icon_url else None
    )
    
    db.session.add(new_product)
    db.session.commit()
    
    return jsonify({
        'success': True,
        'product': new_product.to_dict()
    }), 201

@admin_bp.route('/api/admin/products/<int:product_id>', methods=['PUT'])
@require_admin_session
@require_csrf
def admin_update_product(product_id):
    """Update product details"""
    product = Product.query.get_or_404(product_id)
    data = request.json
    
    product_code = data.get('product_code', '').strip().upper()
    product_name = data.get('product_name', '').strip()
    description = (data.get('description') or '').strip()
    icon_url = (data.get('icon_url') or '').strip()
    
    if product_code:
        if len(product_code) < 2 or len(product_code) > 20:
            return jsonify({'error': 'Product code must be 2-20 characters'}), 400
        
        existing = Product.query.filter_by(product_code=product_code).first()
        if existing and existing.id != product_id:
            return jsonify({'error': 'Product code already exists'}), 400
        product.product_code = product_code
        
    if product_name:
        if len(product_name) < 3:
            return jsonify({'error': 'Product name must be at least 3 characters'}), 400
        product.product_name = product_name
        
    if 'description' in data:
        product.description = description if description else None
        
    if 'icon_url' in data:
        product.icon_url = icon_url if icon_url else None
        
    db.session.commit()
    
    return jsonify({
        'success': True,
        'product': product.to_dict()
    })

@admin_bp.route('/api/admin/products/<int:product_id>/toggle', methods=['POST'])
@require_admin_session
@require_csrf
def admin_toggle_product(product_id):
    """Enable/Disable product and freeze/unfreeze user products"""
    product = Product.query.get_or_404(product_id)
    is_disabling = product.is_active
    
    product.is_active = not product.is_active
    
    user_products = UserProduct.query.filter_by(product_id=product_id).all()
    
    if is_disabling:
        for up in user_products:
            if up.is_active and up.expiry_date:
                expiry = up.expiry_date
                if expiry.tzinfo is None:
                    expiry = expiry.replace(tzinfo=timezone.utc)
                
                if expiry > utc_now():
                    time_remaining = expiry - utc_now()
                    up.days_remaining_when_frozen = int(time_remaining.total_seconds())
                    up.frozen_at = utc_now()
                else:
                    up.days_remaining_when_frozen = None
                    up.frozen_at = None
            
            up.is_active = False
    else:
        for up in user_products:
            license_exists = License.query.filter_by(
                license_key=up.license_key_used,
                product_id=product_id
            ).first()
            
            if not license_exists:
                up.is_active = False
                up.frozen_at = None
                up.days_remaining_when_frozen = None
                continue
            
            if up.frozen_at and up.days_remaining_when_frozen is not None:
                seconds_remaining = up.days_remaining_when_frozen
                up.expiry_date = utc_now() + timedelta(seconds=seconds_remaining)
                up.frozen_at = None
                up.days_remaining_when_frozen = None
                
                expiry = up.expiry_date
                if expiry.tzinfo is None:
                    expiry = expiry.replace(tzinfo=timezone.utc)
                
                if expiry > utc_now():
                    up.is_active = True
                else:
                    up.is_active = False
            elif up.expiry_date:
                expiry = up.expiry_date
                if expiry.tzinfo is None:
                    expiry = expiry.replace(tzinfo=timezone.utc)
                
                if expiry > utc_now():
                    up.is_active = True
                else:
                    up.is_active = False
            else:
                up.is_active = True
    
    db.session.commit()
    
    return jsonify({
        'success': True,
        'product_id': product_id,
        'is_active': product.is_active,
        'message': f'Product {"disabled" if is_disabling else "enabled"}. User subscriptions {"frozen" if is_disabling else "restored with validation"}.'
    })

@admin_bp.route('/api/admin/products/<int:product_id>', methods=['DELETE'])
@require_admin_session
@require_csrf
def admin_delete_product(product_id):
    """Delete product (only if no licenses exist)"""
    product = Product.query.get_or_404(product_id)
    
    license_count = License.query.filter_by(product_id=product_id).count()
    if license_count > 0:
        return jsonify({
            'error': f'Cannot delete product. {license_count} licenses exist. Delete licenses first.'
        }), 400
    
    db.session.delete(product)
    db.session.commit()
    
    return jsonify({
        'success': True,
        'message': f'Product {product.product_name} deleted'
    })

@admin_bp.route('/api/admin/products/<int:product_id>/details', methods=['GET'])
@require_admin_session
def admin_get_product_details(product_id):
    """Get product details"""
    product = Product.query.get_or_404(product_id)
    details = product.details
    
    if not details:
        return jsonify({'success': True, 'details': None})
    
    return jsonify({'success': True, 'details': details.to_dict()})

@admin_bp.route('/api/admin/products/<int:product_id>/upload', methods=['POST'])
@require_admin_session
@require_csrf
def upload_product_file(product_id):
    """Upload product executable file"""
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
        
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    
    print(f"DEBUG: Starting upload for product {product_id} ({file.filename})")
    product = Product.query.get(product_id)
    if not product:
        return jsonify({'error': 'Product not found'}), 404
    
    # Pre-emptive garbage collection for large file processing
    gc.collect()
    
    try:
        # Optimization: Direct assignment and manual cleanup
        print(f"DEBUG: Reading file data into memory...")
        product.file_data = file.read()
        product.file_path = file.filename
        
        # Close and delete the file handle early
        file.close()
        del file
        
        print(f"DEBUG: Committing {len(product.file_data) if product.file_data else 0} bytes to Database...")
        db.session.commit()
        print(f"DEBUG: Database commit successful.")
        
        # Cleanup after heavy DB commit
        gc.collect()
        
        return jsonify({
            'success': True,
            'message': 'File uploaded successfully (stored in DB)', 
            'filename': product.file_path
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Upload failed: {str(e)}'}), 500
    finally:
        gc.collect()

@admin_bp.route('/api/admin/products/<int:product_id>/details', methods=['POST'])
@require_admin_session
@require_csrf
def admin_update_product_details(product_id):
    """Update or create product details"""
    product = Product.query.get_or_404(product_id)
    data = request.json
    
    details = product.details
    if not details:
        details = ProductDetails(product_id=product_id)
        db.session.add(details)
    
    if 'status' in data:
        details.status = data['status']
    if 'status_message' in data:
        details.status_message = data['status_message']
    if 'current_version' in data:
        details.current_version = data['current_version']
    if 'is_safe' in data:
        details.is_safe = data['is_safe']
    if 'detection_status' in data:
        details.detection_status = data['detection_status']
    if 'features' in data:
        details.features = json.dumps(data['features'])
    if 'supported_games' in data:
        details.supported_games = json.dumps(data['supported_games'])
    if 'video_url' in data:
        details.video_url = data['video_url']
    if 'display_order' in data:
        details.display_order = data['display_order']
    if 'is_featured' in data:
        details.is_featured = data['is_featured']
    if 'badge_text' in data:
        details.badge_text = data['badge_text']
    if 'badge_color' in data:
        details.badge_color = data['badge_color']
    if 'video_url' in data:
        details.video_url = data['video_url']
    
    if 'last_detection' in data and data['last_detection']:
        details.last_detection = datetime.fromisoformat(data['last_detection'])
    
    details.last_update = utc_now()
    
    db.session.commit()
    
    return jsonify({
        'success': True,
        'product_id': product_id,
        'details': details.to_dict()
    })

# ========== IMAGES MANAGEMENT ==========

@admin_bp.route('/api/admin/products/<int:product_id>/images', methods=['GET'])
@require_admin_session
def admin_get_product_images(product_id):
    """Get all product images"""
    images = ProductImage.query.filter_by(product_id=product_id).order_by(ProductImage.display_order).all()
    
    return jsonify({
        'total': len(images),
        'images': [img.to_dict() for img in images]
    })

@admin_bp.route('/api/admin/products/<int:product_id>/images/add', methods=['POST'])
@require_admin_session
@require_csrf
def admin_add_product_image(product_id):
    """Add image to product"""
    product = Product.query.get_or_404(product_id)
    
    # Handle optional multipart/form-data or JSON
    if request.content_type and 'multipart/form-data' in request.content_type:
        image_type = request.form.get('image_type', 'screenshot')
        display_order = request.form.get('display_order', 0)
        
        file = request.files.get('file')
        if not file:
            return jsonify({'error': 'No file uploaded'}), 400
            
        filename = secure_filename(file.filename)
        # Ensure unique filename
        import uuid
        ext = os.path.splitext(filename)[1]
        unique_filename = f"{product.product_code.lower()}_{image_type}_{uuid.uuid4().hex[:8]}{ext}"
        
        # Determine upload path
        uploads_dir = os.path.join(current_app.root_path, '..', current_app.config['UPLOAD_FOLDER'], 'images')
        if not os.path.exists(uploads_dir):
            try:
                os.makedirs(uploads_dir, exist_ok=True)
            except:
                # Fallback to absolute path from cwd
                uploads_dir = os.path.join(os.getcwd(), current_app.config['UPLOAD_FOLDER'], 'images')
                os.makedirs(uploads_dir, exist_ok=True)
                
        file_path = os.path.join(uploads_dir, unique_filename)
        file.save(file_path)
        
        image_url = f"/uploads/images/{unique_filename}"
        
    else:
        # Legacy JSON handling
        data = request.json
        image_type = data.get('image_type', 'screenshot')
        display_order = data.get('display_order', 0)
        image_url = data.get('image_url')
        
    image = ProductImage(
        product_id=product_id,
        image_type=image_type,
        image_url=image_url,
        display_order=display_order
    )
    
    db.session.add(image)
    db.session.commit()
    
    return jsonify({
        'success': True,
        'image': image.to_dict()
    }), 201

@admin_bp.route('/api/admin/products/images/<int:image_id>', methods=['DELETE'])
@require_admin_session
@require_csrf
def admin_delete_product_image(image_id):
    """Delete product image"""
    image = ProductImage.query.get_or_404(image_id)
    
    db.session.delete(image)
    db.session.commit()
    
    return jsonify({
        'success': True,
        'message': 'Image deleted'
    })

@admin_bp.route('/api/admin/products/images/<int:image_id>/toggle', methods=['POST'])
@require_admin_session
@require_csrf
def admin_toggle_product_image(image_id):
    """Enable/Disable image"""
    image = ProductImage.query.get_or_404(image_id)
    image.is_active = not image.is_active
    
    db.session.commit()
    
    return jsonify({
        'success': True,
        'image_id': image_id,
        'is_active': image.is_active
    })
