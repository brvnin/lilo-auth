from api.models import Product, ProductImage
from sqlalchemy import or_

def get_loader_product_full_info(product_id):
    """Get complete product info including details and images"""
    product = Product.query.get(product_id)
    if not product:
        return None
    
    result = product.to_dict()
    
    # Add details
    if product.details:
        result['details'] = product.details.to_dict()
    
    # Add images
    images = ProductImage.query.filter_by(
        product_id=product_id, 
        is_active=True
    ).order_by(ProductImage.display_order).all()
    
    result['images'] = {
        'icon': None,
        'banner': None,
        'screenshots': [],
        'previews': []
    }
    
    for img in images:
        if img.image_type == 'icon':
            result['images']['icon'] = img.image_url
        elif img.image_type == 'banner':
            result['images']['banner'] = img.image_url
        elif img.image_type == 'screenshot':
            result['images']['screenshots'].append(img.image_url)
        elif img.image_type == 'preview':
            result['images']['previews'].append(img.image_url)
    
    return result
