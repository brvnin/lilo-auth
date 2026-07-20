import os
import requests
import json
import secrets
import stripe
from flask import Flask, request, jsonify, send_from_directory, make_response
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
from flask_login import LoginManager, login_user, login_required, logout_user, current_user

from models import db, StoreUser, StoreProduct, StoreAnnouncement, UploadedFile, Purchase, Ticket, TicketMessage, Order, LoaderFile
from email_service import send_verification_email, send_password_reset_email, generate_verification_code, send_license_key_email
from itsdangerous import URLSafeTimedSerializer
from datetime import datetime, timedelta
import re

# Calculate absolute path to frontend dist
frontend_dist = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'frontend', 'dist'))
app = Flask(__name__, static_folder=frontend_dist)
CORS(app)

# Configuration
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev_store_secret')
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'sqlite:///store.db')
if app.config['SQLALCHEMY_DATABASE_URI'].startswith('postgres://'):
    app.config['SQLALCHEMY_DATABASE_URI'] = app.config['SQLALCHEMY_DATABASE_URI'].replace('postgres://', 'postgresql://')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Use 'store' schema for all tables
app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
    'connect_args': {
        'options': '-csearch_path=store'
    }
}

UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), 'uploads')
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 100 * 1024 * 1024  # 100MB limit
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

LOADER_API_URL = os.environ.get('LOADER_API_URL', 'http://localhost:5000')
STORE_API_KEY = os.environ.get('STORE_API_KEY', 'dev_store_key')

# Stripe Configuration
stripe.api_key = os.environ.get('STRIPE_SECRET_KEY', '')
STRIPE_WEBHOOK_SECRET = os.environ.get('STRIPE_WEBHOOK_SECRET', '')
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:5173')



from sqlalchemy import text
from functools import wraps

# ========== FRONTEND-ONLY API PROTECTION ==========
# This prevents direct browser access to API endpoints
# Only requests with the correct header (sent by our frontend) are allowed

# Endpoints that should be exempt from frontend-only protection
# (external services that need to call our API directly)
EXEMPT_API_ENDPOINTS = [
    '/api/health',              # Railway/hosting healthcheck
    '/api/files/',              # Image/file serving for <img> tags
    '/api/stripe/webhook',      # Stripe needs to call this directly

    '/api/verify-customer',     # Discord bot calls this with API key
    '/api/loader/download',     # Download requests may come from loader app
]



@app.before_request
def protect_api_endpoints():
    """
    Global protection for ALL /api/ routes.
    Blocks direct browser access - only allows AJAX/API calls from our frontend.
    """
    # Only protect /api/ routes
    if not request.path.startswith('/api/'):
        return None
    
    # Allow exempt endpoints (webhooks, external services)
    for exempt in EXEMPT_API_ENDPOINTS:
        if request.path.startswith(exempt):
            return None
    
    # Check if request has the special header that our frontend sends
    # Direct browser URL access won't have this header
    requested_with = request.headers.get('X-Requested-With', '')
    
    # Also accept requests with proper Content-Type (for POST/PUT requests)
    is_ajax = requested_with.lower() == 'xmlhttprequest'
    is_api_call = request.content_type and 'application/json' in request.content_type
    
    # Also allow multipart form data (for file uploads from frontend)
    is_file_upload = request.content_type and 'multipart/form-data' in request.content_type
    
    # Allow if it's an AJAX request, proper API call, or file upload
    if is_ajax or is_api_call or is_file_upload:
        return None
    
    # Block direct browser access
    return jsonify({'error': 'Direct API access not allowed'}), 403

# Keep the decorator for backwards compatibility (can be removed later)
def require_frontend_request(f):
    """Legacy decorator - protection is now handled globally by before_request"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        return f(*args, **kwargs)
    return decorated_function

# Initialize Extensions
db.init_app(app)
login_manager = LoginManager()
login_manager.init_app(app)

@login_manager.user_loader
def load_user(user_id):
    return StoreUser.query.get(int(user_id))

# Create tables and fix schema
with app.app_context():
    try:
        with db.engine.connect() as conn:
            # Hacky migration: Force update column length if table exists
            conn.execute(text("ALTER TABLE store_user ALTER COLUMN password_hash TYPE VARCHAR(255)"))
            
            # Add new columns if they don't exist (SQLite/Postgres compatible-ish check would be better but we'll just try/except or use specific commands)
            # For simplicity in this environment, we'll try to add them and ignore errors if they exist
            try:
                conn.execute(text("ALTER TABLE store.store_product ADD COLUMN image_url VARCHAR(500)"))
                conn.execute(text("ALTER TABLE store.store_product ADD COLUMN subtitle VARCHAR(100)"))
                conn.execute(text("ALTER TABLE store.store_product ADD COLUMN ban_rate VARCHAR(20) DEFAULT '0%'"))
                conn.execute(text("ALTER TABLE store.store_product ADD COLUMN uptime VARCHAR(20) DEFAULT '99.9%'"))
                conn.execute(text("ALTER TABLE store.store_product ADD COLUMN hwid_spoofer BOOLEAN DEFAULT TRUE"))
                conn.execute(text("ALTER TABLE store.store_product ADD COLUMN server_status VARCHAR(20) DEFAULT 'Online'"))
                conn.commit()
                print("Added new columns to store_product")
            except Exception as e:
                print(f"Columns might already exist: {e}")
            
            # Add is_admin column to store_user
            try:
                conn.execute(text("ALTER TABLE store.store_user ADD COLUMN is_admin BOOLEAN DEFAULT FALSE"))
                conn.commit()
            except Exception as e:
                pass

            # Add manual payment columns to orders
            try:
                conn.execute(text("ALTER TABLE store.orders ADD COLUMN proof_data VARCHAR(500)"))
                conn.execute(text("ALTER TABLE store.orders ADD COLUMN proof_type VARCHAR(50)"))
                conn.commit()
                print("Added manual payment columns to orders")
            except Exception:
                pass
            
            # Add version and price_15days columns to store_product
            try:
                conn.execute(text("ALTER TABLE store.store_product ADD COLUMN version VARCHAR(50) DEFAULT 'V1.0.0 STABLE'"))
                conn.commit()
                print("Added version column to store_product")
            except Exception as e:
                print(f"version column might already exist: {e}")
            
            try:
                conn.execute(text("ALTER TABLE store.store_product ADD COLUMN price_15days FLOAT"))
                conn.commit()
                print("Added price_15days column to store_product")
            except Exception as e:
                print(f"price_15days column might already exist: {e}")
            
            try:
                conn.execute(text("ALTER TABLE store.store_product ADD COLUMN feature_categories TEXT"))
                conn.commit()
                print("Added feature_categories column to store_product")
            except Exception as e:
                print(f"feature_categories column might already exist: {e}")
            
            try:
                conn.execute(text("ALTER TABLE store.store_product ADD COLUMN product_code VARCHAR(50)"))
                conn.commit()
                print("Added product_code column to store_product")
            except Exception as e:
                print(f"product_code column might already exist: {e}")
            
            # Add discord_id to orders table for Discord verification
            try:
                conn.execute(text("ALTER TABLE store.orders ADD COLUMN discord_id VARCHAR(50)"))
                conn.commit()
                print("Added discord_id column to orders")
            except Exception as e:
                print(f"discord_id column might already exist: {e}")
                
            conn.commit()
            print("Updated schema")
    except Exception as e:
        print(f"Schema update skipped (normal if new DB): {e}")

    # Create 'store' schema if using PostgreSQL (SQLite ignores schemas)
    try:
        db.session.execute(text('CREATE SCHEMA IF NOT EXISTS store'))
        db.session.commit()
    except Exception:
        db.session.rollback()

    db.create_all()
    # Create default admin if not exists
    if not StoreUser.query.filter_by(username='admin').first():
        admin = StoreUser(
            username='admin',
            email='admin@zzenith.local',
            password_hash=generate_password_hash('admin'),
            is_verified=True,  # Admin is pre-verified
            is_admin=True  # Mark as admin
        )
        db.session.add(admin)
        db.session.commit()
        print("Created default admin user (admin/admin) - email: admin@zzenith.local")

# --- Routes ---

@app.route('/')
def index():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    if os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    return send_from_directory(app.static_folder, 'index.html')

# --- Public API ---

@app.route('/api/health', methods=['GET'])
def health_check():
    loader_status = 'unknown'
    
    # Check loader API health
    try:
        print(f"[DEBUG] Checking loader health at: {LOADER_API_URL}/api/health")
        # Send health check secret for authentication
        health_secret = os.environ.get('HEALTH_CHECK_SECRET', '')
        headers = {'X-Health-Secret': health_secret} if health_secret else {}
        loader_res = requests.get(f"{LOADER_API_URL}/api/health", timeout=5, headers=headers)
        print(f"[DEBUG] Loader response - Status: {loader_res.status_code}")
        print(f"[DEBUG] Loader response - Body: {loader_res.text[:500]}")
        if loader_res.status_code == 200:
            loader_status = 'operational'
        else:
            # Server responded but with an error - something's wrong
            loader_status = 'degraded'
            print(f"[DEBUG] Loader marked as DEGRADED due to status code: {loader_res.status_code}")
    except requests.exceptions.Timeout:
        print("[DEBUG] Loader health check TIMED OUT")
        loader_status = 'down'
    except requests.exceptions.ConnectionError as e:
        print(f"[DEBUG] Loader health check CONNECTION ERROR: {e}")
        loader_status = 'down'
    except Exception as e:
        print(f"[DEBUG] Loader health check EXCEPTION: {type(e).__name__}: {e}")
        loader_status = 'down'
    
    try:
        # Check database connection
        db.session.execute(text('SELECT 1'))
        return jsonify({
            'status': 'operational' if loader_status == 'operational' else 'degraded',
            'services': {
                'api': 'operational',
                'database': 'operational',
                'website': 'operational',
                'loader': loader_status
            },
            'timestamp': datetime.utcnow().isoformat()
        })
    except Exception as e:
        print(f"Health check failed: {e}")
        return jsonify({
            'status': 'degraded',
            'services': {
                'api': 'operational',
                'database': 'down',
                'website': 'operational',
                'loader': loader_status
            },
            'timestamp': datetime.utcnow().isoformat()
        }), 500

@app.route('/api/products', methods=['GET'])
def get_products():
    products = StoreProduct.query.filter_by(is_active=True).all()
    return jsonify([p.to_dict() for p in products])

@app.route('/api/announcements', methods=['GET'])
def get_announcements():
    announcements = StoreAnnouncement.query.order_by(StoreAnnouncement.created_at.desc()).limit(10).all()
    return jsonify([a.to_dict() for a in announcements])

@app.route('/api/upload', methods=['POST'])
@login_required
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    if file and allowed_file(file.filename):
        try:
            # Read file binary data
            file_data = file.read()
            mimetype = file.content_type
            
            # Generate unique identifier
            file_id = secrets.token_hex(16)
            
            # Store in database
            new_file = UploadedFile(id=file_id, data=file_data, mimetype=mimetype)
            db.session.add(new_file)
            db.session.commit()
            
            return jsonify({'url': f'/api/files/{file_id}'}), 200
        except Exception as e:
            db.session.rollback()
            return jsonify({'error': f'Upload failed: {str(e)}'}), 500
    return jsonify({'error': 'File type not allowed'}), 400

@app.route('/api/files/<file_id>')
def get_uploaded_file(file_id):
    file_record = UploadedFile.query.get(file_id)
    if not file_record:
        return jsonify({'error': 'File not found'}), 404
    
    response = make_response(file_record.data)
    response.headers['Content-Type'] = file_record.mimetype
    response.headers['Cache-Control'] = 'public, max-age=31536000'  # 1 year cache
    return response

# --- AUTHENTICATION SYSTEM ---

# Token serializer for password reset
serializer = URLSafeTimedSerializer(app.config['SECRET_KEY'])

# Security helpers
def validate_email(email):
    """Validate email format"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None

def validate_password(password):
    """Validate password strength - min 8 chars, 1 uppercase, 1 lowercase, 1 number"""
    if len(password) < 8:
        return False, "Password must be at least 8 characters"
    if not re.search(r'[A-Z]', password):
        return False, "Password must contain at least one uppercase letter"
    if not re.search(r'[a-z]', password):
        return False, "Password must contain at least one lowercase letter"
    if not re.search(r'\d', password):
        return False, "Password must contain at least one number"
    return True, "Valid"

def validate_username(username):
    """Validate username - alphanumeric and underscores only, 3-20 chars"""
    if not username or len(username) < 3 or len(username) > 20:
        return False, "Username must be 3-20 characters"
    if not re.match(r'^[a-zA-Z0-9_]+$', username):
        return False, "Username can only contain letters, numbers, and underscores"
    return True, "Valid"

# REGISTER
@app.route('/api/auth/register', methods=['POST'])
def register():
    try:
        data = request.json
        
        # Validate required fields
        if not data.get('email') or not data.get('username') or not data.get('password'):
            return jsonify({'error': 'Missing required fields'}), 400
        
        email = data['email'].strip().lower()
        username = data['username'].strip()
        password = data['password']
        
        # Validate email
        if not validate_email(email):
            return jsonify({'error': 'Invalid email format'}), 400
        
        # Validate username
        is_valid, msg = validate_username(username)
        if not is_valid:
            return jsonify({'error': msg}), 400
        
        # Validate password strength
        is_valid, msg = validate_password(password)
        if not is_valid:
            return jsonify({'error': msg}), 400
        
        # Check if user exists
        if StoreUser.query.filter_by(email=email).first():
            return jsonify({'error': 'Email already registered'}), 400
        if StoreUser.query.filter_by(username=username).first():
            return jsonify({'error': 'Username already taken'}), 400
        
        # Generate verification code
        code = generate_verification_code()
        
        # Create user
        user = StoreUser(
            username=username,
            email=email,
            password_hash=generate_password_hash(password, method='pbkdf2:sha256'),
            verification_code=code,
            verification_code_expires=datetime.utcnow() + timedelta(minutes=15),
            is_verified=False
        )
        
        db.session.add(user)
        db.session.commit()
        
        # Send verification email
        if send_verification_email(user.email, user.username, code):
            print(f"[AUTH] User registered: {username} ({email})")
            return jsonify({
                'success': True,
                'message': 'Registration successful. Check your email for verification code.',
                'user_id': user.id
            }), 201
        else:
            # Rollback if email fails
            db.session.delete(user)
            db.session.commit()
            return jsonify({'error': 'Failed to send verification email. Please try again.'}), 500
    
    except Exception as e:
        db.session.rollback()
        print(f"[ERROR] Registration failed: {e}")
        return jsonify({'error': 'Registration failed. Please try again.'}), 500


# VERIFY EMAIL
@app.route('/api/auth/verify', methods=['POST'])
def verify_email():
    try:
        data = request.json
        user = StoreUser.query.get(data.get('user_id'))
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        if user.is_verified:
            return jsonify({'error': 'Account already verified'}), 400
        
        # Check code expiration
        if datetime.utcnow() > user.verification_code_expires:
            return jsonify({'error': 'Verification code expired. Please request a new one.'}), 400
        
        # Verify code
        if user.verification_code == str(data.get('code')).strip():
            user.is_verified = True
            user.verification_code = None
            user.verification_code_expires = None
            db.session.commit()
            
            login_user(user)
            print(f"[AUTH] Email verified: {user.username}")
            return jsonify({'success': True, 'message': 'Email verified successfully', 'username': user.username}), 200
        else:
            return jsonify({'error': 'Invalid verification code'}), 400
    
    except Exception as e:
        print(f"[ERROR] Verification failed: {e}")
        return jsonify({'error': 'Verification failed. Please try again.'}), 500

# RESEND VERIFICATION CODE
@app.route('/api/auth/resend-code', methods=['POST'])
def resend_verification():
    try:
        data = request.json
        user = StoreUser.query.get(data.get('user_id'))
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        if user.is_verified:
            return jsonify({'error': 'Account already verified'}), 400
        
        # Generate new code
        code = generate_verification_code()
        user.verification_code = code
        user.verification_code_expires = datetime.utcnow() + timedelta(minutes=15)
        db.session.commit()
        
        if send_verification_email(user.email, user.username, code):
            print(f"[AUTH] Verification code resent: {user.username}")
            return jsonify({'success': True, 'message': 'Verification code sent'}), 200
        else:
            return jsonify({'error': 'Failed to send email. Please try again.'}), 500
    
    except Exception as e:
        print(f"[ERROR] Resend failed: {e}")
        return jsonify({'error': 'Failed to resend code. Please try again.'}), 500

# LOGIN
@app.route('/api/auth/login', methods=['POST'])
def auth_login():
    try:
        data = request.json
        username_or_email = data.get('username', '').strip()
        password = data.get('password', '')
        
        if not username_or_email or not password:
            return jsonify({'error': 'Missing credentials'}), 400
        
        # Try to find user by username or email
        user = StoreUser.query.filter(
            (StoreUser.username == username_or_email) | (StoreUser.email == username_or_email.lower())
        ).first()
        
        if not user or not check_password_hash(user.password_hash, password):
            print(f"[AUTH] Failed login attempt: {username_or_email}")
            return jsonify({'error': 'Invalid credentials'}), 401
        
        if not user.is_verified:
            print(f"[AUTH] Unverified login attempt: {user.username}")
            return jsonify({
                'error': 'Please verify your email first',
                'user_id': user.id,
                'email': user.email,
                'needs_verification': True
            }), 403
        
        login_user(user, remember=True)
        print(f"[AUTH] Successful login: {user.username}")
        return jsonify({'success': True, 'username': user.username}), 200
    
    except Exception as e:
        print(f"[ERROR] Login failed: {e}")
        return jsonify({'error': 'Login failed. Please try again.'}), 500

# LOGOUT
@app.route('/api/auth/logout', methods=['POST'])
@login_required
def auth_logout():
    username = current_user.username
    logout_user()
    print(f"[AUTH] Logout: {username}")
    return jsonify({'success': True}), 200

# CHECK AUTH STATUS
@app.route('/api/auth/status', methods=['GET'])
def auth_status():
    if current_user.is_authenticated:
        return jsonify({
            'authenticated': True,
            'username': current_user.username,
            'email': current_user.email,
            'created_at': current_user.created_at.isoformat() if current_user.created_at else None,
            'is_admin': current_user.is_admin
        }), 200
    return jsonify({'authenticated': False}), 200

# GET USER PURCHASES
@app.route('/api/purchases', methods=['GET'])
@login_required
def get_purchases():
    try:
        # Get all purchases for current user
        purchases = Purchase.query.filter_by(user_id=current_user.id).order_by(Purchase.purchase_date.desc()).all()
        
        purchase_list = []
        for p in purchases:
            product = StoreProduct.query.get(p.product_id)
            purchase_list.append({
                'id': p.id,
                'product_name': product.title if product else 'Unknown Product',
                'price': float(p.price),
                'purchase_date': p.purchase_date.isoformat(),
                'license_key': p.license_key
            })
        
        return jsonify({'purchases': purchase_list}), 200
    except Exception as e:
        print(f"[ERROR] Failed to get purchases: {e}")
        return jsonify({'error': 'Failed to load purchases'}), 500

# FORGOT PASSWORD
@app.route('/api/auth/forgot-password', methods=['POST'])
def forgot_password():
    try:
        data = request.json
        email = data.get('email', '').strip().lower()
        
        if not email or not validate_email(email):
            return jsonify({'error': 'Invalid email format'}), 400
        
        user = StoreUser.query.filter_by(email=email).first()
        
        # Always return success to prevent email enumeration
        if not user:
            print(f"[AUTH] Password reset requested for non-existent email: {email}")
            return jsonify({'success': True, 'message': 'If email exists, reset link will be sent'}), 200
        
        # Generate reset token
        token = serializer.dumps(user.email, salt='password-reset')
        user.reset_token = token
        user.reset_token_expires = datetime.utcnow() + timedelta(hours=1)
        db.session.commit()
        
        # Reset link - use env variable for domain or detect from request
        domain = os.getenv('FRONTEND_URL', 'https://courteous-commitment-production.up.railway.app')
        reset_link = f"{domain}/reset-password?token={token}"
        
        if send_password_reset_email(user.email, user.username, reset_link):
            print(f"[AUTH] Password reset link sent: {user.username}")
            return jsonify({'success': True, 'message': 'Password reset link sent to your email'}), 200
        else:
            return jsonify({'error': 'Failed to send email. Please try again.'}), 500
    
    except Exception as e:
        print(f"[ERROR] Forgot password failed: {e}")
        return jsonify({'error': 'Failed to process request. Please try again.'}), 500

# RESET PASSWORD
@app.route('/api/auth/reset-password', methods=['POST'])
def reset_password():
    try:
        data = request.json
        token = data.get('token')
        new_password = data.get('password')
        
        if not token or not new_password:
            return jsonify({'error': 'Missing required fields'}), 400
        
        # Validate password strength
        is_valid, msg = validate_password(new_password)
        if not is_valid:
            return jsonify({'error': msg}), 400
        
        # Verify token
        try:
            email = serializer.loads(token, salt='password-reset', max_age=3600)
        except:
            return jsonify({'error': 'Invalid or expired reset link'}), 400
        
        user = StoreUser.query.filter_by(email=email).first()
        
        if not user or user.reset_token != token:
            return jsonify({'error': 'Invalid reset link'}), 400
        
        if datetime.utcnow() > user.reset_token_expires:
            return jsonify({'error': 'Reset link expired. Please request a new one.'}), 400
        
        user.password_hash = generate_password_hash(new_password, method='pbkdf2:sha256')
        user.reset_token = None
        user.reset_token_expires = None
        db.session.commit()
        
        print(f"[AUTH] Password reset successful: {user.username}")
        return jsonify({'success': True, 'message': 'Password reset successful'}), 200
    
    except Exception as e:
        print(f"[ERROR] Password reset failed: {e}")
        return jsonify({'error': 'Failed to reset password. Please try again.'}), 500


@app.route('/api/buy', methods=['POST'])
def buy_product():
    data = request.json
    product_id = data.get('product_id')
    
    # 1. Get Store Product
    store_product = StoreProduct.query.get(product_id)
    if not store_product:
        return jsonify({'error': 'Product not found'}), 404
        
    if not store_product.loader_product_id:
        return jsonify({'error': 'Product not linked to Loader'}), 500

    # 2. Mock Payment (In production, verify Stripe/PayPal here)
    
    # 3. Request License from Loader API
    try:
        response = requests.post(
            f"{LOADER_API_URL}/api/internal/generate_license",
            json={
                'product_id': store_product.loader_product_id,
                'subscription_type': 'month', # Default
                'quantity': 1
            },
            headers={'X-Store-API-Key': STORE_API_KEY},
            timeout=10
        )
        
        if response.status_code != 201:
            return jsonify({'error': 'Failed to generate license', 'details': response.text}), 500
            
        license_data = response.json()
        
        return jsonify({
            'success': True,
            'message': 'Purchase successful',
            'license_key': license_data['licenses'][0],
            'product_name': store_product.title
        })
        
    except Exception as e:
        return jsonify({'error': 'Internal Server Error', 'details': str(e)}), 500

# --- Admin API ---

# Security: Track failed login attempts for rate limiting
admin_login_attempts = {}

def get_client_ip():
    """Get real client IP, considering proxies"""
    # Try X-Forwarded-For first (most common with proxies)
    if request.headers.get('X-Forwarded-For'):
        ips = [ip.strip() for ip in request.headers.get('X-Forwarded-For').split(',')]
        # Return the first IP (original client) if available
        if ips and ips[0]:
            return ips[0]
    
    # Try X-Real-IP
    if request.headers.get('X-Real-IP'):
        return request.headers.get('X-Real-IP').strip()
    
    # Fallback to direct connection IP
    return request.remote_addr.strip() if request.remote_addr else ''

def is_ip_allowed():
    """Check if client IP is in the whitelist"""
    allowed_ips = os.environ.get('ADMIN_ALLOWED_IPS', '')
    if not allowed_ips:
        # If no whitelist configured, allow all (fallback)
        return True
    
    client_ip = get_client_ip()
    allowed_list = [ip.strip() for ip in allowed_ips.split(',') if ip.strip()]
    
    # Debug logging to help troubleshoot IP issues
    print(f"[DEBUG] Client IP detected: {client_ip}")
    print(f"[DEBUG] Allowed IPs: {allowed_list}")
    print(f"[DEBUG] X-Forwarded-For header: {request.headers.get('X-Forwarded-For', 'Not present')}")
    print(f"[DEBUG] X-Real-IP header: {request.headers.get('X-Real-IP', 'Not present')}")
    print(f"[DEBUG] request.remote_addr: {request.remote_addr}")
    
    # Check if client IP matches any allowed IP (case-insensitive for consistency)
    is_allowed = client_ip in allowed_list
    print(f"[DEBUG] IP match result: {is_allowed}")
    
    return is_allowed

def check_rate_limit(ip):
    """Rate limit: max 5 attempts per 15 minutes"""
    now = datetime.utcnow()
    if ip in admin_login_attempts:
        attempts, first_attempt = admin_login_attempts[ip]
        # Reset after 15 minutes
        if (now - first_attempt).total_seconds() > 900:
            admin_login_attempts[ip] = (1, now)
            return True
        if attempts >= 5:
            return False
        admin_login_attempts[ip] = (attempts + 1, first_attempt)
    else:
        admin_login_attempts[ip] = (1, now)
    return True

@app.route('/api/admin/ip-check', methods=['GET'])
@require_frontend_request
def admin_ip_check():
    """Check if current IP is allowed to access admin panel (does NOT reveal whitelist)"""
    client_ip = get_client_ip()
    allowed_ips = os.environ.get('ADMIN_ALLOWED_IPS', '')
    allowed_list = [ip.strip() for ip in allowed_ips.split(',') if ip.strip()] if allowed_ips else []
    is_allowed = client_ip in allowed_list
    
    # SECURITY: Only return whether IP is allowed, NOT the whitelist itself
    # This prevents attackers from discovering whitelisted IPs
    return jsonify({
        'is_ip_allowed': is_allowed
    })

@app.route('/api/admin/login', methods=['POST'])
@require_frontend_request
def admin_login():
    client_ip = get_client_ip()
    
    # Security: Check IP whitelist first
    if not is_ip_allowed():
        print(f"[SECURITY] Admin login blocked - IP not allowed: {client_ip}")
        return jsonify({'error': 'Access denied'}), 403
    
    # Security: Rate limiting
    if not check_rate_limit(client_ip):
        print(f"[SECURITY] Admin login blocked - Rate limit exceeded: {client_ip}")
        return jsonify({'error': 'Too many attempts. Try again in 15 minutes.'}), 429
    
    data = request.json
    username = data.get('username')
    password = data.get('password')
    
    # Security: Get admin credentials from environment variables
    admin_username = os.environ.get('ADMIN_USERNAME')
    admin_password_hash = os.environ.get('ADMIN_PASSWORD_HASH')
    
    if not admin_username or not admin_password_hash:
        print("[ERROR] Admin credentials not configured in environment")
        return jsonify({'error': 'Admin access not configured'}), 500
    
    # Verify credentials against environment variables
    if username != admin_username:
        print(f"[SECURITY] Admin login failed - Invalid username from {client_ip}")
        return jsonify({'error': 'Invalid credentials'}), 401
    
    # Check password against bcrypt hash from env
    import bcrypt
    try:
        password_bytes = password.encode('utf-8')
        hash_bytes = admin_password_hash.encode('utf-8')
        
        print(f"[DEBUG] Checking password for user: {username}")
        print(f"[DEBUG] Hash starts with: {admin_password_hash[:20]}...")
        
        if bcrypt.checkpw(password_bytes, hash_bytes):
            # Get or create admin user in database for session management
            user = StoreUser.query.filter_by(username=username).first()
            
            if not user:
                # Create admin user if doesn't exist
                print(f"[INFO] Creating admin user in database: {username}")
                user = StoreUser(
                    username=username,
                    email=f'{username}@admin.local',
                    password_hash=admin_password_hash,
                    is_verified=True,
                    is_admin=True
                )
                db.session.add(user)
                db.session.commit()
            
            login_user(user)
            print(f"[SECURITY] Admin login SUCCESS from {client_ip}")
            # Clear failed attempts on success
            if client_ip in admin_login_attempts:
                del admin_login_attempts[client_ip]
            return jsonify({'success': True})
        else:
            print(f"[SECURITY] Admin login failed - Invalid password from {client_ip}")
            return jsonify({'error': 'Invalid credentials'}), 401
    except Exception as e:
        print(f"[ERROR] Password verification failed: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': 'Invalid credentials'}), 401

@app.route('/api/admin/logout', methods=['POST'])
@require_frontend_request
@login_required
def admin_logout():
    logout_user()
    return jsonify({'success': True})

@app.route('/api/admin/check', methods=['GET'])
@require_frontend_request
def check_auth():
    # Also verify IP on check
    if not is_ip_allowed():
        return jsonify({'authenticated': False, 'error': 'IP not allowed'}), 403
    
    if current_user.is_authenticated:
        return jsonify({'authenticated': True, 'username': current_user.username})
    return jsonify({'authenticated': False}), 401

# Product Management
@app.route('/api/admin/products', methods=['POST'])
@login_required
def create_product():
    data = request.json
    # Helper to safely convert to float
    def safe_float(value):
        if value is None or value == '':
            return None
        try:
            return float(value)
        except (ValueError, TypeError):
            return None
    
    product = StoreProduct(
        title=data['title'],
        game=data['game'],
        price=float(data['price']),
        category=data.get('category'),
        status=data.get('status', 'Undetected'),
        features=','.join(data.get('features', [])),
        highlights=','.join(data.get('highlights', [])),
        price_day=safe_float(data.get('price_day')),
        price_week=safe_float(data.get('price_week')),
        price_15days=safe_float(data.get('price_15days')),
        price_month=safe_float(data.get('price_month')),
        version=data.get('version', 'V1.0.0 STABLE'),
        gallery_images=json.dumps(data.get('gallery_images', [])),
        video_url=data.get('video_url'),
        color=data.get('color'),
        accent=data.get('accent'),
        loader_product_id=data.get('loader_product_id'),
        image_url=data.get('image_url'),
        subtitle=data.get('subtitle'),
        ban_rate=data.get('ban_rate', '0%'),
        uptime=data.get('uptime', '99.9%'),
        hwid_spoofer=data.get('hwid_spoofer', True),
        server_status=data.get('server_status', 'Online'),
        feature_categories=json.dumps(data.get('feature_categories', []))
    )
    db.session.add(product)
    db.session.commit()
    return jsonify({'success': True, 'product': product.to_dict()})

@app.route('/api/admin/products/<int:id>', methods=['PUT'])
@login_required
def update_product(id):
    product = StoreProduct.query.get_or_404(id)
    data = request.json
    
    product.title = data.get('title', product.title)
    product.game = data.get('game', product.game)
    product.price = float(data.get('price', product.price))
    product.category = data.get('category', product.category)
    product.status = data.get('status', product.status)
    if 'features' in data:
        product.features = ','.join(data['features'])
    if 'highlights' in data:
        product.highlights = ','.join(data['highlights'])
    
    # Safe conversion for pricing
    def safe_float(value):
        if value is None or value == '':
            return None
        try:
            return float(value)
        except (ValueError, TypeError):
            return None
    
    if 'price_day' in data:
        product.price_day = safe_float(data.get('price_day'))
    if 'price_week' in data:
        product.price_week = safe_float(data.get('price_week'))
    if 'price_15days' in data:
        product.price_15days = safe_float(data.get('price_15days'))
    if 'price_month' in data:
        product.price_month = safe_float(data.get('price_month'))
    if 'version' in data:
        product.version = data.get('version')

    if 'gallery_images' in data:
        product.gallery_images = json.dumps(data['gallery_images'])
    if 'video_url' in data:
        product.video_url = data.get('video_url')
    
    product.color = data.get('color', product.color)
    product.accent = data.get('accent', product.accent)
    product.loader_product_id = data.get('loader_product_id', product.loader_product_id)
    product.product_code = data.get('product_code', product.product_code)
    
    product.image_url = data.get('image_url', product.image_url)
    product.subtitle = data.get('subtitle', product.subtitle)
    product.ban_rate = data.get('ban_rate', product.ban_rate)
    product.uptime = data.get('uptime', product.uptime)
    product.hwid_spoofer = data.get('hwid_spoofer', product.hwid_spoofer)
    product.server_status = data.get('server_status', product.server_status)
    
    if 'feature_categories' in data:
        product.feature_categories = json.dumps(data['feature_categories'])
    
    db.session.commit()
    return jsonify({'success': True, 'product': product.to_dict()})

@app.route('/api/admin/products/<int:id>', methods=['DELETE'])
@login_required
def delete_product(id):
    product = StoreProduct.query.get_or_404(id)
    db.session.delete(product)
    db.session.commit()
    return jsonify({'success': True})

# ===== ORDER MANAGEMENT =====

@app.route('/api/admin/orders', methods=['GET'])
@login_required
def get_admin_orders():
    """Get all orders with filtering (admin only)"""
    if not current_user.is_admin:
        return jsonify({'error': 'Admin access required'}), 403
    
    status = request.args.get('status')
    
    query = Order.query
    if status:
        query = query.filter_by(status=status)
        
    # Sort by newest first
    orders = query.order_by(Order.created_at.desc()).limit(100).all()
    
    return jsonify([o.to_dict() for o in orders])

@app.route('/api/admin/orders/<int:order_id>/approve', methods=['POST'])
@login_required
def admin_approve_order(order_id):
    """Manually approve an order and deliver keys (admin only)"""
    if not current_user.is_admin:
        return jsonify({'error': 'Admin access required'}), 403
        
    order = Order.query.get_or_404(order_id)
    
    if order.status == 'paid':
        return jsonify({'error': 'Order already paid'}), 400
        
    try:
        # Mark as paid
        order.status = 'paid'
        order.paid_at = datetime.utcnow()
        
        # Generate licenses
        items = json.loads(order.items)
        license_keys = []
        for item in items:
            try:
                product_code = item.get('product_code') or item.get('game', 'DEFAULT').upper().replace(' ', '')
                subscription_plan = item.get('selectedPlan', 'month')
                
                response = requests.post(
                    f"{LOADER_API_URL}/api/internal/generate_license",
                    json={
                        'product_code': product_code,
                        'subscription_type': subscription_plan
                    },
                    headers={
                        'X-Store-API-Key': STORE_API_KEY,
                        'Content-Type': 'application/json'
                    },
                    timeout=10
                )
                
                if response.status_code == 201:
                    lic_data = response.json()
                    license_keys.append(lic_data.get('license_key', 'ERROR'))
                else:
                    license_keys.append(f"MANUAL-{secrets.token_hex(4).upper()}")
            except Exception as e:
                print(f"License gen failed: {e}")
                license_keys.append(f"MANUAL-{secrets.token_hex(4).upper()}")
        
        order.license_keys = json.dumps(license_keys)
        db.session.commit()
        
        # Send Email
        send_license_key_email(order.email, order.id, items, license_keys)
        
        return jsonify({'success': True, 'message': 'Order approved and keys sent'})
        
    except Exception as e:
        print(f"[ERROR] Admin approve failed: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/orders/<int:order_id>/reject', methods=['POST'])
@login_required
def admin_reject_order(order_id):
    """Reject/Cancel an order (admin only)"""
    if not current_user.is_admin:
        return jsonify({'error': 'Admin access required'}), 403
        
    order = Order.query.get_or_404(order_id)
    order.status = 'failed'
    db.session.commit()
    
    return jsonify({'success': True, 'message': 'Order rejected'})

# ===== TICKET SYSTEM =====

# USER ENDPOINTS

@app.route('/api/tickets/create', methods=['POST'])
@login_required
def create_ticket():
    try:
        data = request.json
        
        # Check if user already has an open ticket
        existing_open = Ticket.query.filter_by(user_id=current_user.id).filter(
            Ticket.status.in_(['Open', 'Pending'])
        ).first()
        
        if existing_open:
            return jsonify({
                'error': 'You already have an open ticket. Please wait for it to be resolved before creating a new one.',
                'existing_ticket_id': existing_open.id
            }), 400
        
        # Create ticket
        ticket = Ticket(
            user_id=current_user.id,
            subject=data['subject'],
            category=data['category'],
            priority=data.get('priority', 'Medium')
        )
        db.session.add(ticket)
        db.session.flush()  # Get ticket ID
        
        # Create first message (user's message)
        message = TicketMessage(
            ticket_id=ticket.id,
            sender_id=current_user.id,
            message=data['message'],
            is_admin_reply=False
        )
        db.session.add(message)
        
        # Create automatic welcome message
        welcome_msg = TicketMessage(
            ticket_id=ticket.id,
            sender_id=1,  # System/Admin account
            message="Thank you for contacting support! Our team has received your ticket and will respond as soon as possible. Average response time is 1-3 business days.",
            is_admin_reply=True
        )
        db.session.add(welcome_msg)
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'ticket_id': ticket.id
        }), 201
    except Exception as e:
        db.session.rollback()
        print(f"[ERROR] Create ticket failed: {e}")
        return jsonify({'error': 'Failed to create ticket'}), 500

@app.route('/api/tickets/my-tickets', methods=['GET'])
@login_required
def get_my_tickets():
    try:
        tickets = Ticket.query.filter_by(user_id=current_user.id).order_by(Ticket.updated_at.desc()).all()
        
        result = []
        for ticket in tickets:
            message_count = len(ticket.messages)
            last_message = ticket.messages[-1] if ticket.messages else None
            
            result.append({
                'id': ticket.id,
                'subject': ticket.subject,
                'category': ticket.category,
                'priority': ticket.priority,
                'status': ticket.status,
                'created_at': ticket.created_at.isoformat(),
                'updated_at': ticket.updated_at.isoformat(),
                'message_count': message_count,
                'last_reply': last_message.created_at.isoformat() if last_message else None
            })
        
        return jsonify({'tickets': result}), 200
    except Exception as e:
        print(f"[ERROR] Get my tickets failed: {e}")
        return jsonify({'error': 'Failed to load tickets'}), 500

@app.route('/api/tickets/<int:ticket_id>', methods=['GET'])
@login_required
def get_ticket(ticket_id):
    try:
        ticket = Ticket.query.get_or_404(ticket_id)
        
        # Check ownership
        if ticket.user_id != current_user.id and not current_user.is_admin:
            return jsonify({'error': 'Unauthorized'}), 403
        
        messages = []
        for msg in ticket.messages:
            messages.append({
                'id': msg.id,
                'sender_name': msg.sender.username,
                'message': msg.message,
                'is_admin_reply': msg.is_admin_reply,
                'created_at': msg.created_at.isoformat()
            })
        
        return jsonify({
            'ticket': {
                'id': ticket.id,
                'subject': ticket.subject,
                'category': ticket.category,
                'priority': ticket.priority,
                'status': ticket.status,
                'created_at': ticket.created_at.isoformat(),
                'updated_at': ticket.updated_at.isoformat(),
                'user_name': ticket.user.username
            },
            'messages': messages
        }), 200
    except Exception as e:
        print(f"[ERROR] Get ticket failed: {e}")
        return jsonify({'error': 'Failed to load ticket'}), 500

@app.route('/api/tickets/<int:ticket_id>/reply', methods=['POST'])
@login_required
def reply_to_ticket(ticket_id):
    try:
        ticket = Ticket.query.get_or_404(ticket_id)
        
        # Check ownership
        if ticket.user_id != current_user.id:
            return jsonify({'error': 'Unauthorized'}), 403
        
        # Check if ticket is closed
        if ticket.status == 'Closed':
            return jsonify({'error': 'Cannot reply to closed ticket'}), 400
        
        data = request.json
        message = TicketMessage(
            ticket_id=ticket.id,
            sender_id=current_user.id,
            message=data['message'],
            is_admin_reply=False
        )
        db.session.add(message)
        
        # Update ticket timestamp and set to pending if was closed
        ticket.updated_at = datetime.utcnow()
        if ticket.status == 'Closed':
            ticket.status = 'Pending'
        
        db.session.commit()
        
        return jsonify({'success': True}), 201
    except Exception as e:
        db.session.rollback()
        print(f"[ERROR] Reply to ticket failed: {e}")
        return jsonify({'error': 'Failed to send reply'}), 500

# ADMIN ENDPOINTS

@app.route('/api/admin/tickets', methods=['GET'])
@login_required
def get_all_tickets():
    try:
        if not current_user.is_admin:
            return jsonify({'error': 'Unauthorized'}), 403
        
        # Get filter params
        status_filter = request.args.get('status')
        priority_filter = request.args.get('priority')
        
        query = Ticket.query
        
        if status_filter:
            query = query.filter_by(status=status_filter)
        if priority_filter:
            query = query.filter_by(priority=priority_filter)
        
        tickets = query.order_by(Ticket.updated_at.desc()).all()
        
        result = []
        for ticket in tickets:
            result.append({
                'id': ticket.id,
                'subject': ticket.subject,
                'category': ticket.category,
                'priority': ticket.priority,
                'status': ticket.status,
                'user_name': ticket.user.username,
                'user_id': ticket.user_id,
                'created_at': ticket.created_at.isoformat(),
                'updated_at': ticket.updated_at.isoformat(),
                'message_count': len(ticket.messages)
            })
        
        return jsonify({'tickets': result}), 200
    except Exception as e:
        print(f"[ERROR] Get all tickets failed: {e}")
        return jsonify({'error': 'Failed to load tickets'}), 500

@app.route('/api/admin/tickets/<int:ticket_id>/reply', methods=['POST'])
@login_required
def admin_reply_to_ticket(ticket_id):
    try:
        if not current_user.is_admin:
            return jsonify({'error': 'Unauthorized'}), 403
        
        ticket = Ticket.query.get_or_404(ticket_id)
        data = request.json
        
        message = TicketMessage(
            ticket_id=ticket.id,
            sender_id=current_user.id,
            message=data['message'],
            is_admin_reply=True
        )
        db.session.add(message)
        
        # Update ticket timestamp
        ticket.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({'success': True}), 201
    except Exception as e:
        db.session.rollback()
        print(f"[ERROR] Admin reply failed: {e}")
        return jsonify({'error': 'Failed to send reply'}), 500

@app.route('/api/admin/tickets/<int:ticket_id>/status', methods=['PATCH'])
@login_required
def update_ticket_status(ticket_id):
    try:
        if not current_user.is_admin:
            return jsonify({'error': 'Unauthorized'}), 403
        
        ticket = Ticket.query.get_or_404(ticket_id)
        data = request.json
        
        if 'status' in data:
            ticket.status = data['status']
        if 'priority' in data:
            ticket.priority = data['priority']
        
        ticket.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({'success': True}), 200
    except Exception as e:
        db.session.rollback()
        print(f"[ERROR] Update ticket status failed: {e}")
        return jsonify({'error': 'Failed to update ticket'}), 500

@app.route('/api/admin/tickets/<int:ticket_id>', methods=['DELETE'])
@login_required
def delete_ticket(ticket_id):
    try:
        if not current_user.is_admin:
            return jsonify({'error': 'Unauthorized'}), 403
        
        ticket = Ticket.query.get_or_404(ticket_id)
        # Delete associated messages first
        TicketMessage.query.filter_by(ticket_id=ticket.id).delete()
        db.session.delete(ticket)
        db.session.commit()
        
        return jsonify({'success': True}), 200
    except Exception as e:
        db.session.rollback()
        print(f"[ERROR] Delete ticket failed: {e}")
        return jsonify({'error': 'Failed to delete ticket'}), 500


# --- STRIPE PAYMENT ROUTES ---

@app.route('/api/checkout/stripe', methods=['POST'])
def create_stripe_checkout():
    """Create a Stripe checkout session"""
    try:
        data = request.json
        cart_items = data.get('items', [])
        email = data.get('email', '')
        
        if not cart_items:
            return jsonify({'error': 'Cart is empty'}), 400
        
        if not email:
            return jsonify({'error': 'Email is required'}), 400
        
        # Build line items for Stripe
        line_items = []
        for item in cart_items:
            line_items.append({
                'price_data': {
                    'currency': 'usd',
                    'product_data': {
                        'name': item.get('title', 'Product'),
                        'description': f"Plan: {item.get('selectedPlan', 'License')}",
                    },
                    'unit_amount': int(float(item.get('price', 0)) * 100),  # Stripe uses cents
                },
                'quantity': 1,
            })
        
        # Calculate total
        total = sum(float(item.get('price', 0)) for item in cart_items)
        
        # Create order in database
        user_id = current_user.id if current_user.is_authenticated else None
        order = Order(
            user_id=user_id,
            email=email,
            items=json.dumps(cart_items),
            total=total,
            status='pending',
            payment_method='stripe'
        )
        db.session.add(order)
        db.session.commit()
        
        # Create Stripe checkout session
        checkout_session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=line_items,
            mode='payment',
            customer_email=email,
            success_url=f"{FRONTEND_URL}/checkout/success?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{FRONTEND_URL}/checkout/cancel",
            metadata={
                'order_id': order.id
            }
        )
        
        # Update order with Stripe session ID
        order.stripe_session_id = checkout_session.id
        db.session.commit()
        
        return jsonify({
            'checkout_url': checkout_session.url,
            'session_id': checkout_session.id,
            'order_id': order.id
        })
        
    except Exception as e:
        print(f"[ERROR] Stripe checkout failed: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/webhooks/stripe', methods=['POST'])
def stripe_webhook():
    """Handle Stripe webhook events"""
    payload = request.get_data(as_text=True)
    sig_header = request.headers.get('Stripe-Signature')
    
    try:
        if STRIPE_WEBHOOK_SECRET:
            event = stripe.Webhook.construct_event(
                payload, sig_header, STRIPE_WEBHOOK_SECRET
            )
        else:
            # For testing without webhook secret
            event = json.loads(payload)
    except ValueError as e:
        print(f"[ERROR] Invalid payload: {e}")
        return jsonify({'error': 'Invalid payload'}), 400
    except stripe.error.SignatureVerificationError as e:
        print(f"[ERROR] Invalid signature: {e}")
        return jsonify({'error': 'Invalid signature'}), 400
    
    # Handle the checkout.session.completed event
    if event['type'] == 'checkout.session.completed':
        session = event['data']['object']
        order_id = session.get('metadata', {}).get('order_id')
        
        if order_id:
            order = Order.query.get(int(order_id))
            if order and order.status == 'pending':
                # Mark order as paid
                order.status = 'paid'
                order.stripe_payment_intent = session.get('payment_intent')
                order.paid_at = datetime.utcnow()
                
                # Generate license keys for each item via Loader API
                items = json.loads(order.items)
                license_keys = []
                for item in items:
                    try:
                        # Get product code from product_code field or derive from game name
                        product_code = item.get('product_code') or item.get('game', 'DEFAULT').upper().replace(' ', '')
                        subscription_plan = item.get('selectedPlan', 'month')  # day, week, 15days, month, lifetime
                        
                        # Call Loader API to generate license
                        response = requests.post(
                            f"{LOADER_API_URL}/api/internal/generate_license",
                            json={
                                'product_code': product_code,
                                'subscription_type': subscription_plan
                            },
                            headers={
                                'X-Store-API-Key': STORE_API_KEY,
                                'Content-Type': 'application/json'
                            },
                            timeout=10
                        )
                        
                        if response.status_code == 201:
                            data = response.json()
                            license_keys.append(data.get('license_key', 'ERROR-CONTACT-SUPPORT'))
                            print(f"[SUCCESS] Generated license for {product_code}: {data.get('license_key')}")
                        else:
                            print(f"[ERROR] Loader API error: {response.text}")
                            license_keys.append(f"PENDING-{secrets.token_hex(4).upper()}")
                    except Exception as e:
                        print(f"[ERROR] Failed to generate license: {e}")
                        license_keys.append(f"PENDING-{secrets.token_hex(4).upper()}")
                
                order.license_keys = json.dumps(license_keys)
                db.session.commit()
                
                # Send license key email
                send_license_key_email(order.email, order.id, items, license_keys)
                print(f"[SUCCESS] Order #{order.id} completed, license keys sent to {order.email}")
    
    return jsonify({'received': True}), 200

@app.route('/api/checkout/verify', methods=['POST'])
def verify_checkout():
    """Verify checkout session and return order details"""
    try:
        data = request.json
        session_id = data.get('session_id')
        
        if not session_id:
            return jsonify({'error': 'Session ID required'}), 400
        
        # Find order by session ID
        order = Order.query.filter_by(stripe_session_id=session_id).first()
        
        if not order:
            return jsonify({'error': 'Order not found'}), 404
        
        # If order is still pending, check with Stripe
        if order.status == 'pending':
            try:
                session = stripe.checkout.Session.retrieve(session_id)
                if session.payment_status == 'paid':
                    # Process the order
                    order.status = 'paid'
                    order.stripe_payment_intent = session.payment_intent
                    order.paid_at = datetime.utcnow()
                    
                    # Generate license keys via Loader API
                    items = json.loads(order.items)
                    license_keys = []
                    for item in items:
                        try:
                            product_code = item.get('product_code') or item.get('game', 'DEFAULT').upper().replace(' ', '')
                            subscription_plan = item.get('selectedPlan', 'month')
                            
                            response = requests.post(
                                f"{LOADER_API_URL}/api/internal/generate_license",
                                json={
                                    'product_code': product_code,
                                    'subscription_type': subscription_plan
                                },
                                headers={
                                    'X-Store-API-Key': STORE_API_KEY,
                                    'Content-Type': 'application/json'
                                },
                                timeout=10
                            )
                            
                            if response.status_code == 201:
                                data = response.json()
                                license_keys.append(data.get('license_key', 'ERROR-CONTACT-SUPPORT'))
                            else:
                                license_keys.append(f"PENDING-{secrets.token_hex(4).upper()}")
                        except Exception as e:
                            print(f"[ERROR] Failed to generate license: {e}")
                            license_keys.append(f"PENDING-{secrets.token_hex(4).upper()}")
                    
                    order.license_keys = json.dumps(license_keys)
                    db.session.commit()
                    
                    # Send email
                    send_license_key_email(order.email, order.id, items, license_keys)
            except Exception as e:
                print(f"[ERROR] Stripe session check failed: {e}")
        
        return jsonify({
            'order': order.to_dict(),
            'success': order.status == 'paid'
        })
        
    except Exception as e:
        print(f"[ERROR] Verify checkout failed: {e}")
        return jsonify({'error': str(e)}), 500










@app.route('/api/webhooks/crypto', methods=['POST'])
@app.route('/api/checkout/manual', methods=['POST'])
@login_required
@require_frontend_request
def create_manual_checkout():
    """Create a pending order for manual payment (Crypto/GiftCard)"""
    try:
        data = request.json
        cart_items = data.get('items', [])
        email = data.get('email', '')
        payment_type = data.get('type', 'manual_crypto') # manual_crypto or manual_giftcard
        
        if not cart_items:
            return jsonify({'error': 'Cart is empty'}), 400
            
        # Calculate total
        total = sum(float(item.get('price', 0)) for item in cart_items)
        
        # Create order in database
        user_id = current_user.id if current_user.is_authenticated else None
        order = Order(
            user_id=user_id,
            email=email,
            items=json.dumps(cart_items),
            total=total,
            status='pending',
            payment_method=payment_type
        )
        db.session.add(order)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'order_id': order.id,
            'message': 'Order created. Waiting for payment proof.'
        })

    except Exception as e:
        print(f"[ERROR] Manual checkout failed: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/checkout/manual/submit-proof', methods=['POST'])
@login_required
@require_frontend_request
def submit_manual_proof():
    """Submit proof (TXID or Gift Card Code) for manual order"""
    try:
        data = request.json
        order_id = data.get('order_id')
        proof_data = data.get('proof_data') # The Code or TXID
        proof_type = data.get('proof_type') # 'txid' or 'giftcard'
        
        if not order_id or not proof_data:
            return jsonify({'error': 'Missing data'}), 400
            
        order = Order.query.get(order_id)
        if not order:
            return jsonify({'error': 'Order not found'}), 404
            
        if order.status != 'pending':
            return jsonify({'error': 'Order is not pending'}), 400
            
        # Update order
        order.proof_data = proof_data
        order.proof_type = proof_type
        order.status = 'verification_pending' # Custom status for admin to check
        db.session.commit()
        
        print(f"[MANUAL PAYMENT] New proof submitted for Order #{order.id}: {proof_type} - {proof_data}")
        
        return jsonify({'success': True})

    except Exception as e:
        print(f"[ERROR] Proof submission failed: {e}")
        return jsonify({'error': str(e)}), 500

# Discord Customer Verification API
VERIFY_API_KEY = os.environ.get('VERIFY_API_KEY', 'your-secret-verify-key')
@app.route('/api/verify-customer', methods=['GET'])
def verify_customer():
    """Verify if email has a paid order - used by Discord bot for Customer role"""
    try:
        # Validate API key
        api_key = request.headers.get('X-Verify-Key', '')
        if api_key != VERIFY_API_KEY:
            return jsonify({'error': 'Invalid API key'}), 401
        
        email = request.args.get('email', '').lower().strip()
        discord_id = request.args.get('discord_id', '').strip()
        
        if not email:
            return jsonify({'error': 'Email required'}), 400
        
        # Check if email has any paid orders
        order = Order.query.filter_by(email=email, status='paid').first()
        
        if not order:
            return jsonify({'error': 'No paid orders found for this email'}), 404
        
        # Check if this email is already linked to a different Discord
        if order.discord_id and order.discord_id != discord_id:
            return jsonify({'error': 'Email already linked to another Discord account'}), 409
        
        # Save Discord ID to order (if provided)
        if discord_id and not order.discord_id:
            order.discord_id = discord_id
            db.session.commit()
            print(f"[VERIFY] Linked Discord {discord_id} to email {email}")
        
        return jsonify({
            'verified': True,
            'email': email,
            'order_id': order.id,
            'products': json.loads(order.items) if order.items else []
        })
        
    except Exception as e:
        print(f"[ERROR] Customer verification failed: {e}")
        return jsonify({'error': 'Verification failed'}), 500


# ═══════════════════════════════════════════════════════════════
# LOADER FILE MANAGEMENT
# ═══════════════════════════════════════════════════════════════

@app.route('/api/admin/loader', methods=['POST'])
@login_required
def upload_loader():
    """Upload a new loader file (admin only)"""
    if not current_user.is_admin:
        return jsonify({'error': 'Admin access required'}), 403
    
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    version = request.form.get('version', 'v1.0.0')
    
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    try:
        # Read file data
        file_data = file.read()
        filename = secure_filename(file.filename)
        
        # Deactivate all existing loaders
        LoaderFile.query.update({LoaderFile.is_active: False})
        
        # Create new loader record
        loader = LoaderFile(
            filename=filename,
            version=version,
            data=file_data,
            size=len(file_data),
            is_active=True
        )
        
        db.session.add(loader)
        db.session.commit()
        
        print(f"[LOADER] Uploaded new loader: {filename} v{version} ({len(file_data)} bytes)")
        
        return jsonify({
            'success': True,
            'loader': loader.to_dict()
        })
        
    except Exception as e:
        print(f"[ERROR] Loader upload failed: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/loaders', methods=['GET'])
@login_required
def list_loaders():
    """List all uploaded loaders (admin only)"""
    if not current_user.is_admin:
        return jsonify({'error': 'Admin access required'}), 403
    
    loaders = LoaderFile.query.order_by(LoaderFile.uploaded_at.desc()).all()
    return jsonify([l.to_dict() for l in loaders])

@app.route('/api/admin/loader/<int:loader_id>', methods=['DELETE'])
@login_required
def delete_loader(loader_id):
    """Delete a loader file (admin only)"""
    if not current_user.is_admin:
        return jsonify({'error': 'Admin access required'}), 403
    
    loader = LoaderFile.query.get_or_404(loader_id)
    db.session.delete(loader)
    db.session.commit()
    
    return jsonify({'success': True})

@app.route('/api/admin/loader/<int:loader_id>/activate', methods=['POST'])
@login_required
def activate_loader(loader_id):
    """Set a loader as the active version (admin only)"""
    if not current_user.is_admin:
        return jsonify({'error': 'Admin access required'}), 403
    
    # Deactivate all
    LoaderFile.query.update({LoaderFile.is_active: False})
    
    # Activate selected
    loader = LoaderFile.query.get_or_404(loader_id)
    loader.is_active = True
    db.session.commit()
    
    return jsonify({'success': True, 'loader': loader.to_dict()})

@app.route('/api/loader/download', methods=['GET'])
def download_loader():
    """Download the active loader (public - for customers)"""
    loader = LoaderFile.query.filter_by(is_active=True).first()
    
    if not loader:
        return jsonify({'error': 'No loader available'}), 404
    
    response = make_response(loader.data)
    response.headers['Content-Type'] = 'application/octet-stream'
    response.headers['Content-Disposition'] = f'attachment; filename={loader.filename}'
    response.headers['Content-Length'] = loader.size
    response.headers['Cache-Control'] = 'public, max-age=86400'  # Cache for 1 day
    response.headers['ETag'] = f'"{loader.version}"'  # Use version as ETag for cache validation
    
    return response

@app.route('/api/loader/info', methods=['GET'])
def loader_info():
    """Get info about the current active loader"""
    loader = LoaderFile.query.filter_by(is_active=True).first()
    
    if not loader:
        return jsonify({'available': False})
    
    return jsonify({
        'available': True,
        'version': loader.version,
        'filename': loader.filename,
        'size': loader.size,
        'uploaded_at': loader.uploaded_at.isoformat() if loader.uploaded_at else None
    })


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)
