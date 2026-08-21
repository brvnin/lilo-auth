from flask import Blueprint, request, jsonify
from datetime import timedelta, timezone
import traceback
from api.extensions import db
from api.config import Config
from api.models import User, License, UserProduct, SubscriptionRenewal, Product
from api.services.security import brute_force
from api.services.encryption import hash_password, check_password, encrypt_data
from api.services.validation import verify_token, hash_hwid, log_login_attempt, log_validation, check_suspicious_validation, create_session_token
from api.utils.decorators import rate_limit
from api.utils.helpers import utc_now

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/api/register', methods=['POST'])
@rate_limit(limit=3, window=60)
def register():
    """Register new user with license key - RACE CONDITION PROTECTED"""
    data = request.json
    username = data.get('username', '').strip()
    password = data.get('password', '').strip()
    license_key = data.get('license_key', '').strip()
    hwid_raw = data.get('hwid', '')
    hwid = hash_hwid(hwid_raw)
    email = data.get('email', '').strip() if data.get('email') else None
    
    if not username or len(username) < 3 or len(username) > 20:
        return jsonify({'error': 'Username must be 3-20 characters'}), 400
    
    if not password or len(password) < 8:
        return jsonify({'error': 'Password must be at least 8 characters'}), 400
    
    if not license_key:
        return jsonify({'error': 'License key required'}), 400
    
    # 🔒 RACE CONDITION FIX: Lock the license row immediately
    try:
        license_obj = License.query.filter_by(
            license_key=license_key, 
            used=False
        ).with_for_update(nowait=True).first()  # 🔒 Lock + nowait to fail fast
        
        if not license_obj:
            return jsonify({'error': 'Invalid or already used license key'}), 400
    except Exception as e:
        # If lock fails (another transaction is using this license), reject immediately
        print(f"License lock failed: {e}")
        return jsonify({'error': 'License key is currently being processed by another request'}), 409
    
    # Check if product is active
    if not license_obj.product:
        return jsonify({'error': 'Product not found for this license'}), 400
    
    if not license_obj.product.is_active:
        return jsonify({
            'error': f'{license_obj.product.product_name} is currently disabled. Access temporarily suspended. Please contact support.'
        }), 400
    
    # Check if user already exists
    user = User.query.filter_by(username=username).first()
    
    # Check username availability (only if user doesn't exist)
    if not user:
        if User.query.filter_by(username=username).first():
            return jsonify({'error': 'Username already taken'}), 400
        
        if email and User.query.filter_by(email=email).first():
            return jsonify({'error': 'Email already registered'}), 400
    
    # Check HWID ban
    hwid_banned_user = User.query.filter_by(hwid=hwid, hwid_banned=True).first()
    if hwid_banned_user:
        return jsonify({'error': 'This device (HWID) is banned from the system'}), 403
    
    try:
        if not user:
            # Create new user
            user = User(
                username=username,
                email=email,
                password_hash=hash_password(password),
                hwid=hwid,
                hwid_encrypted=encrypt_data(hwid_raw),
                subscription_type='basic',
                last_ip=request.remote_addr
            )
            db.session.add(user)
            db.session.flush()  # Get user.id
        
        # Calculate expiry
        if license_obj.duration_days:
            expiry = utc_now() + timedelta(days=license_obj.duration_days)
        else:
            expiry = None
        
        # Check if user already has this product
        existing_user_product = UserProduct.query.filter_by(
            user_id=user.id,
            product_id=license_obj.product_id
        ).first()
        
        # Determine if this is a new subscription or renewal
        is_new_subscription = existing_user_product is None
        
        if existing_user_product:
            # User already has this product - this is a renewal
            if existing_user_product.is_active:
                return jsonify({'error': 'You already have an active subscription for this product. Use renew instead.'}), 400
            
            # If inactive, reactivate it
            existing_user_product.subscription_type = license_obj.subscription_type
            existing_user_product.expiry_date = expiry
            existing_user_product.is_active = True
            existing_user_product.license_key_used = license_key
            existing_user_product.activated_at = utc_now()
            is_new_subscription = False
        else:
            # User doesn't have this product - NEW subscription
            user_product = UserProduct(
                user_id=user.id,
                product_id=license_obj.product_id,
                subscription_type=license_obj.subscription_type,
                expiry_date=expiry,
                license_key_used=license_key,
                is_active=True
            )
            db.session.add(user_product)
            is_new_subscription = True
        
        # 🔒 Mark license as used (already locked, so safe)
        license_obj.used = True
        license_obj.used_by = username
        license_obj.used_at = utc_now()
        license_obj.is_renewal = not is_new_subscription
        
        # Log as renewal if user already had this product
        if not is_new_subscription:
            renewal_log = SubscriptionRenewal(
                username=username,
                license_key=license_key,
                product_id=license_obj.product_id,
                old_subscription_type=existing_user_product.subscription_type if existing_user_product else None,
                new_subscription_type=license_obj.subscription_type,
                old_expiry_date=existing_user_product.expiry_date if existing_user_product else None,
                new_expiry_date=expiry,
                days_added=license_obj.duration_days,
                ip_address=request.remote_addr,
                user_agent=request.headers.get('User-Agent', ''),
                renewal_method='self_service',
                is_new_subscription=False
            )
            db.session.add(renewal_log)
        
        # 🔒 Commit everything in one transaction
        db.session.commit()
        
        token = create_session_token(username)
        log_login_attempt(username, request.remote_addr, True, 'Registration successful')
        
        # Get user products for response
        user_data = user.to_dict()
        user_products = UserProduct.query.filter_by(user_id=user.id).all()
        user_data['products'] = [up.to_dict() for up in user_products]
        
        return jsonify({
            'success': True,
            'message': f'Activated {license_obj.product.product_name}',
            'token': token,
            'session_key': Config.DRIVER_KEY_PART,
            'user': user_data,
            'product': license_obj.product.to_dict(),
            'expiry': expiry.isoformat() if expiry else 'lifetime'
        }), 201
    except Exception as e:
        db.session.rollback()
        print(f"Registration error: {e}")
        traceback.print_exc()
        return jsonify({'error': 'Registration failed. Please try again.'}), 500

@auth_bp.route('/api/login', methods=['POST'])
@rate_limit(limit=10, window=60)  # 10 requests per minute
def login():
    """Login with brute force protection"""
    data = request.json
    username = data.get('username', '').strip()
    password = data.get('password', '').strip()
    hwid_raw = data.get('hwid', '')
    hwid = hash_hwid(hwid_raw)
    ip_address = request.remote_addr
    
    print(f"DEBUG: Login attempt for user={username} hwid={data.get('hwid')} ip={ip_address}")
    
    # ✅ CHECK BRUTE FORCE FIRST
    is_blocked, block_reason, retry_after = brute_force.check_and_record(username, ip_address, success=False)
    
    if is_blocked:
        log_login_attempt(username, ip_address, False, block_reason)
        print(f"DEBUG: Login blocked for user={username}: {block_reason}")
        response = jsonify({
            'error': block_reason,
            'retry_after': retry_after
        })
        response.headers['Retry-After'] = str(retry_after)
        return response, 429
    
    user = User.query.filter_by(username=username).first()
    
    if not user or not check_password(password, user.password_hash):
        # ✅ RECORD FAILED ATTEMPT
        brute_force.check_and_record(username, ip_address, success=False)
        log_login_attempt(username, ip_address, False, 'Invalid credentials')
        print(f"DEBUG: Login failed for user={username}: Invalid credentials")
        return jsonify({'error': 'Invalid credentials'}), 401
    
    if user.is_banned:
        log_login_attempt(username, ip_address, False, 'Account banned')
        print(f"DEBUG: Login failed for user={username}: Banned")
        return jsonify({'error': f'Account banned: {user.ban_reason}'}), 403
    
    if not user.is_active:
        log_login_attempt(username, ip_address, False, 'Account disabled')
        print(f"DEBUG: Login failed for user={username}: Disabled")
        return jsonify({'error': 'Account disabled. Contact support'}), 403
    
    if user.hwid_banned:
        log_login_attempt(username, ip_address, False, 'HWID banned')
        print(f"DEBUG: Login failed for user={username}: HWID banned")
        return jsonify({'error': 'HWID banned. Contact support'}), 403
    
    if user.hwid is None:
        user.hwid = hwid
        user.hwid_encrypted = encrypt_data(hwid_raw)
    elif user.hwid != hwid:
        log_login_attempt(username, ip_address, False, 'HWID mismatch')
        print(f"DEBUG: Login failed for user={username}: HWID mismatch (Stored={user.hwid}, Provided={hwid})")
        return jsonify({'error': 'HWID mismatch. Contact support for reset'}), 403
    else:
        # HWID matches - backfill encrypted if missing
        if user.hwid_encrypted is None:
            user.hwid_encrypted = encrypt_data(hwid_raw)
    
    # Check subscriptions
    user_products = UserProduct.query.filter_by(user_id=user.id).all()
    
    if user_products:
        disabled_products = []
        expired_products = []
        active_products = []
        
        for up in user_products:
            # FIX BUG 1 REMINDER: Note that login just checks is_active.
            # We fix the admin extension logic in admin routes, not here.
            # Here we just trust the DB state.
            
            if not up.is_active:
                disabled_products.append(up.product.product_name if up.product else 'Unknown')
                continue
            
            if not up.product or not up.product.is_active:
                disabled_products.append(up.product.product_name if up.product else 'Unknown')
                continue
            
            if up.expiry_date:
                if not up.frozen_at:
                    expiry = up.expiry_date
                    if expiry.tzinfo is None:
                        expiry = expiry.replace(tzinfo=timezone.utc)
                    
                    if utc_now() > expiry:
                        expired_products.append(up.product.product_name)
                        continue
            
            active_products.append(up.product.product_name)
        
        if not active_products:
            error_parts = []
            if disabled_products:
                error_parts.append(f"Disabled: {', '.join(disabled_products)}")
            if expired_products:
                error_parts.append(f"Expired: {', '.join(expired_products)}")
            
            error_message = "No active subscriptions. " + " | ".join(error_parts) if error_parts else "All subscriptions are inactive."
            log_login_attempt(username, ip_address, False, 'No active product subscriptions')
            print(f"DEBUG: Login failed for user={username}: No active subscriptions")
            return jsonify({
                'error': error_message,
                'details': {
                    'disabled_products': disabled_products,
                    'expired_products': expired_products
                }
            }), 403
    else:
        # Legacy check or global subscription
        if user.expiry_date:
            expiry_date = user.expiry_date
            if expiry_date.tzinfo is None:
                expiry_date = expiry_date.replace(tzinfo=timezone.utc)
            
            if utc_now() > expiry_date:
                log_login_attempt(username, ip_address, False, 'Subscription expired')
                print(f"DEBUG: Login failed for user={username}: Legacy subscription expired")
                return jsonify({'error': 'Subscription expired'}), 403
        else:
            # If no products and no global expiry, block login
            log_login_attempt(username, ip_address, False, 'No active subscription')
            print(f"DEBUG: Login failed for user={username}: No active subscription (Legacy)")
            return jsonify({'error': 'No active subscription found'}), 403
    
    # ✅ SUCCESS - RESET BRUTE FORCE COUNTER
    brute_force.check_and_record(username, ip_address, success=True)
    
    user.last_login = utc_now()
    user.last_ip = ip_address
    db.session.commit()
    
    log_login_attempt(username, ip_address, True, 'Login successful')
    token = create_session_token(username)
    
    print(f"DEBUG: Login successful for user={username}. Token generated.")
    return jsonify({
        'success': True,
        'token': token,
        'session_key': Config.DRIVER_KEY_PART,
        'user': user.to_dict()
    })

@auth_bp.route('/api/validate', methods=['POST'])
@rate_limit(limit=60, window=60)
def validate():
    """Validate token, HWID, and product access"""
    data = request.json
    token = data.get('token', '').strip()
    product_code = data.get('product_code', '').strip()  # ← جديد
    hwid = hash_hwid(data.get('hwid', ''))
    ip_address = request.remote_addr
    
    print(f"DEBUG: Validate attempt for token={token[:10]}... product={product_code}")
    
    username, valid = verify_token(token)
    
    if not valid or not username:
        log_validation(username or 'unknown', ip_address, False)
        print(f"DEBUG: Validate failed: Invalid or expired token")
        return jsonify({'valid': False, 'error': 'Invalid or expired token'}), 401
    
    user = User.query.filter_by(username=username).first()
    if not user:
        print(f"DEBUG: Validate failed: User {username} not found")
        return jsonify({'valid': False, 'error': 'User not found'}), 404
    
    if check_suspicious_validation(username):
        print(f"DEBUG: Validate failed: Suspicious activity for {username}")
        return jsonify({'valid': False, 'error': 'Suspicious activity detected'}), 429
    
    if user.hwid != hwid:
        log_validation(username, ip_address, False)
        print(f"DEBUG: Validate failed: HWID mismatch for {username}")
        return jsonify({'valid': False, 'error': 'HWID mismatch'}), 403
    
    if user.hwid_banned:
        log_validation(username, ip_address, False)
        print(f"DEBUG: Validate failed: HWID banned for {username}")
        return jsonify({'valid': False, 'error': 'HWID banned'}), 403
    
    if user.is_banned:
        print(f"DEBUG: Validate failed: User {username} is banned")
        return jsonify({'valid': False, 'error': f'Account banned: {user.ban_reason}'}), 403
    
    if not user.is_active:
        print(f"DEBUG: Validate failed: User {username} is disabled")
        return jsonify({'valid': False, 'error': 'Account disabled'}), 403
    
    # Product validation
    if product_code:
        product = Product.query.filter_by(product_code=product_code).first()
        if not product:
            print(f"DEBUG: Validate failed: Product {product_code} not found")
            return jsonify({'valid': False, 'error': 'Invalid product code'}), 404
        
        # Check if product is disabled
        if not product.is_active:
            log_validation(username, ip_address, False)
            print(f"DEBUG: Validate failed: Product {product.product_name} disabled")
            return jsonify({
                'valid': False,
                'error': f'{product.product_name} is currently disabled. Access temporarily suspended.'
            }), 403
        
        # 🔒 CHEAT VERSION CHECK: If cheat sends a version, verify it matches server
        cheat_version = data.get('cheat_version', '').strip()
        if cheat_version and product.current_version:
            # Normalize versions (strip 'v' prefix if present)
            client_ver = cheat_version.lstrip('vV')
            server_ver = product.current_version.lstrip('vV')
            
            if client_ver != server_ver:
                log_validation(username, ip_address, False)
                print(f"DEBUG: Validate failed: Cheat version mismatch! Client={cheat_version}, Server={product.current_version}")
                return jsonify({
                    'valid': False,
                    'error': 'Outdated cheat version. Please update via the loader.',
                    'client_version': cheat_version,
                    'required_version': product.current_version
                }), 403
        
        # Find user's product subscription
        user_product = UserProduct.query.filter_by(
            user_id=user.id,
            product_id=product.id
        ).first()
        
        if not user_product:
            print(f"DEBUG: Validate failed: User {username} has no sub for {product.product_name}")
            return jsonify({
                'valid': False,
                'error': f'No subscription found for {product.product_name}'
            }), 403
        
        # Check if user_product is active
        if not user_product.is_active:
            log_validation(username, ip_address, False)
            print(f"DEBUG: Validate failed: Sub for {product.product_name} inactive")
            return jsonify({
                'valid': False,
                'error': f'{product.product_name} subscription is temporarily disabled'
            }), 403
        
        # Check expiry (only if not frozen)
        if user_product.expiry_date:
            if not user_product.frozen_at:
                expiry_date = user_product.expiry_date
                if expiry_date.tzinfo is None:
                    expiry_date = expiry_date.replace(tzinfo=timezone.utc)
                
                if utc_now() > expiry_date:
                    log_validation(username, ip_address, False)
                    print(f"DEBUG: Validate failed: Sub for {product.product_name} expired")
                    return jsonify({
                        'valid': False,
                        'error': f'{product.product_name} subscription expired'
                    }), 403
        
        # Update stats regardless of legacy/new flow
        try:
            user.last_validation = utc_now()
            user.validation_count += 1
            db.session.commit()
        except Exception as e:
            print(f"DEBUG: Failed to update validation stats: {e}")
            db.session.rollback()
        
        log_validation(username, ip_address, True)
        
        # ✅ LOADER REQUIREMENT: Check activation source
        # If the key exists in License table -> Key Activated
        # If not -> Admin Added
        license_exists = License.query.filter_by(license_key=user_product.license_key_used).first()
        activation_source = 'key_activation' if license_exists else 'admin_added'
        
        print(f"DEBUG: Validate success for {username} product={product_code}")
        return jsonify({
            'valid': True,
            'username': username,
            'session_key': Config.DRIVER_KEY_PART,
            'product': product.product_name,
            'product_code': product.product_code,
            'subscription_type': user_product.subscription_type,
            'expiry': user_product.expiry_date.isoformat() if user_product.expiry_date else 'lifetime',
            'activation_source': activation_source, # New field
            'display_status': 'Subscription Added' if activation_source == 'admin_added' else 'Key Activated' # Helpful text
        })
    else:
        # Backward compatibility
        if user.expiry_date:
            expiry_date = user.expiry_date
            if expiry_date.tzinfo is None:
                expiry_date = expiry_date.replace(tzinfo=timezone.utc)
            
            if utc_now() > expiry_date:
                log_login_attempt(username, ip_address, False)
                print(f"DEBUG: Validate failed (legacy): Expired")
                return jsonify({'valid': False, 'error': 'Subscription expired'}), 403
        
        user.last_validation = utc_now()
        user.validation_count += 1
        db.session.commit()
        
        log_validation(username, ip_address, True)
        
        print(f"DEBUG: Validate success (legacy) for {username}")
        return jsonify({
            'valid': True,
            'username': username,
            'session_key': Config.DRIVER_KEY_PART,
            'subscription_type': user.subscription_type,
            'expiry': user.expiry_date.isoformat() if user.expiry_date else 'lifetime'
        })
