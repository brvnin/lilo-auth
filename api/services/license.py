import secrets
import hashlib

def generate_product_license_key(product_code: str, sub_type: str) -> str:
    """Generate license key with product code"""
    random_bytes = secrets.token_bytes(12)
    random_hex = random_bytes.hex()
    
    # First 5 chars of product code
    prefix = product_code[:5].upper()
    
    # First 4 chars of subscription type
    sub_prefix = sub_type[:4].upper()
    
    # Checksum
    checksum = hashlib.sha256(f"{prefix}{sub_prefix}{random_hex}".encode()).hexdigest()[:4]
    
    return f"{prefix}-{sub_prefix}-{random_hex[:4]}-{random_hex[4:8]}-{checksum}"

def generate_license_key(sub_type: str) -> str:
    """Legacy function for backward compatibility"""
    return generate_product_license_key("DEFAULT", sub_type)
