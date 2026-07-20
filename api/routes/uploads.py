from flask import Blueprint, send_from_directory, current_app, abort
import os

uploads_bp = Blueprint('uploads', __name__)

@uploads_bp.route('/uploads/<path:filename>')
def serve_upload(filename):
    """Serve uploaded files"""
    uploads_dir = os.path.join(current_app.root_path, '..', current_app.config['UPLOAD_FOLDER'])
    if not os.path.exists(uploads_dir):
        # Try relative to instance path or root
        uploads_dir = os.path.join(current_app.root_path, current_app.config['UPLOAD_FOLDER'])
        
    if not os.path.exists(uploads_dir):
        # Fallback for dev environment usually in root
        uploads_dir = os.path.join(os.getcwd(), current_app.config['UPLOAD_FOLDER'])
        
    return send_from_directory(uploads_dir, filename)
