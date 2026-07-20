from flask import Blueprint, request, jsonify
import json
from datetime import datetime
from api.extensions import db
from api.models import LoaderVersion, LoaderFeature, LoaderConfig, Announcement
from api.utils.helpers import utc_now
from api.utils.decorators import require_admin_session, require_csrf

system_bp = Blueprint('admin_system', __name__)

# ========== LOADER VERSION MANAGEMENT ==========

@system_bp.route('/loader/versions', methods=['GET'])
@require_admin_session
def admin_get_loader_versions():
    """Get all loader versions"""
    versions = LoaderVersion.query.order_by(LoaderVersion.released_at.desc()).all()
    return jsonify({
        'total': len(versions),
        'versions': [v.to_dict() for v in versions]
    })

@system_bp.route('/loader/versions/create', methods=['POST'])
@require_admin_session
@require_csrf
def admin_create_loader_version():
    """Create new loader version"""
    data = request.json
    
    if data.get('is_current'):
        LoaderVersion.query.update({'is_current': False})
    
    if data.get('is_required'):
        LoaderVersion.query.update({'is_required': False})
    
    version = LoaderVersion(
        version=data.get('version'),
        is_current=data.get('is_current', False),
        is_required=data.get('is_required', False),
        download_url=data.get('download_url'),
        changelog=data.get('changelog'),
        file_size=data.get('file_size'),
        file_hash=data.get('file_hash')
    )
    
    db.session.add(version)
    db.session.commit()
    
    return jsonify({
        'success': True,
        'version': version.to_dict()
    }), 201

@system_bp.route('/loader/versions/<int:version_id>/set_current', methods=['POST'])
@require_admin_session
@require_csrf
def admin_set_current_loader_version(version_id):
    """Set a version as current"""
    LoaderVersion.query.update({'is_current': False})
    
    version = LoaderVersion.query.get_or_404(version_id)
    version.is_current = True
    
    db.session.commit()
    
    return jsonify({
        'success': True,
        'message': f'Version {version.version} is now current'
    })

@system_bp.route('/loader/versions/<int:version_id>/set_required', methods=['POST'])
@require_admin_session
@require_csrf
def admin_set_required_loader_version(version_id):
    """Set minimum required version"""
    LoaderVersion.query.update({'is_required': False})
    
    version = LoaderVersion.query.get_or_404(version_id)
    version.is_required = True
    
    db.session.commit()
    
    return jsonify({
        'success': True,
        'message': f'Version {version.version} is now required'
    })

# ========== ANNOUNCEMENTS ==========

@system_bp.route('/announcements', methods=['GET'])
@require_admin_session
def admin_get_all_announcements():
    """Get all announcements"""
    announcements = Announcement.query.order_by(Announcement.created_at.desc()).all()
    return jsonify({
        'total': len(announcements),
        'announcements': [a.to_dict() for a in announcements]
    })

@system_bp.route('/announcements/create', methods=['POST'])
@require_admin_session
@require_csrf
def admin_create_announcement():
    """Create new announcement"""
    data = request.json
    
    announcement = Announcement(
        title=data.get('title') or 'Important Update',
        message=data.get('message', ''),
        type=data.get('type', 'info'),
        icon=data.get('icon'),
        action_text=data.get('action_text'),
        action_url=data.get('action_url'),
        is_dismissible=data.get('is_dismissible', True),
        priority=data.get('priority', 0),
        target_products=json.dumps(data['target_products']) if data.get('target_products') else None,
        expires_at=datetime.fromisoformat(data['expires_at']) if data.get('expires_at') else None
    )
    
    db.session.add(announcement)
    db.session.commit()
    
    return jsonify({
        'success': True,
        'announcement': announcement.to_dict()
    }), 201

@system_bp.route('/announcements/<int:announcement_id>', methods=['PUT'])
@require_admin_session
@require_csrf
def admin_update_announcement(announcement_id):
    """Update announcement"""
    announcement = Announcement.query.get_or_404(announcement_id)
    data = request.json
    
    if 'title' in data:
        announcement.title = data['title']
    if 'message' in data:
        announcement.message = data['message']
    if 'type' in data:
        announcement.type = data['type']
    if 'icon' in data:
        announcement.icon = data['icon']
    if 'action_text' in data:
        announcement.action_text = data['action_text']
    if 'action_url' in data:
        announcement.action_url = data['action_url']
    if 'is_dismissible' in data:
        announcement.is_dismissible = data['is_dismissible']
    if 'priority' in data:
        announcement.priority = data['priority']
    if 'target_products' in data:
        announcement.target_products = json.dumps(data['target_products']) if data['target_products'] else None
    if 'expires_at' in data:
        announcement.expires_at = datetime.fromisoformat(data['expires_at']) if data['expires_at'] else None
    
    db.session.commit()
    
    return jsonify({
        'success': True,
        'announcement': announcement.to_dict()
    })

@system_bp.route('/announcements/<int:announcement_id>/toggle', methods=['POST'])
@require_admin_session
@require_csrf
def admin_toggle_announcement(announcement_id):
    """Enable/Disable announcement"""
    announcement = Announcement.query.get_or_404(announcement_id)
    announcement.is_active = not announcement.is_active
    
    db.session.commit()
    
    return jsonify({
        'success': True,
        'announcement_id': announcement_id,
        'is_active': announcement.is_active
    })

@system_bp.route('/announcements/<int:announcement_id>', methods=['DELETE'])
@require_admin_session
@require_csrf
def admin_delete_announcement(announcement_id):
    """Delete announcement"""
    announcement = Announcement.query.get_or_404(announcement_id)
    
    db.session.delete(announcement)
    db.session.commit()
    
    return jsonify({
        'success': True,
        'message': 'Announcement deleted'
    })

# ========== FEATURES MANAGEMENT ==========

@system_bp.route('/features', methods=['GET'])
@require_admin_session
def admin_get_all_features():
    """Get all features"""
    features = LoaderFeature.query.order_by(LoaderFeature.display_order).all()
    return jsonify({
        'total': len(features),
        'features': [f.to_dict() for f in features]
    })

@system_bp.route('/features/create', methods=['POST'])
@require_admin_session
@require_csrf
def admin_create_feature():
    """Create new feature"""
    data = request.json
    
    feature = LoaderFeature(
        feature_key=data.get('feature_key'),
        feature_name=data.get('feature_name'),
        is_enabled=data.get('is_enabled', True),
        is_premium=data.get('is_premium', False),
        description=data.get('description'),
        config=json.dumps(data['config']) if data.get('config') else None,
        icon=data.get('icon'),
        display_order=data.get('display_order', 0)
    )
    
    db.session.add(feature)
    db.session.commit()
    
    return jsonify({
        'success': True,
        'feature': feature.to_dict()
    }), 201

@system_bp.route('/features/<int:feature_id>', methods=['PUT'])
@require_admin_session
@require_csrf
def admin_update_feature(feature_id):
    """Update feature"""
    feature = LoaderFeature.query.get_or_404(feature_id)
    data = request.json
    
    if 'feature_name' in data:
        feature.feature_name = data['feature_name']
    if 'is_enabled' in data:
        feature.is_enabled = data['is_enabled']
    if 'is_premium' in data:
        feature.is_premium = data['is_premium']
    if 'description' in data:
        feature.description = data['description']
    if 'config' in data:
        feature.config = json.dumps(data['config']) if data['config'] else None
    if 'icon' in data:
        feature.icon = data['icon']
    if 'display_order' in data:
        feature.display_order = data['display_order']
    
    feature.updated_at = utc_now()
    db.session.commit()
    
    return jsonify({
        'success': True,
        'feature': feature.to_dict()
    })

@system_bp.route('/features/<int:feature_id>/toggle', methods=['POST'])
@require_admin_session
@require_csrf
def admin_toggle_feature(feature_id):
    """Enable/Disable feature"""
    feature = LoaderFeature.query.get_or_404(feature_id)
    feature.is_enabled = not feature.is_enabled
    feature.updated_at = utc_now()
    
    db.session.commit()
    
    return jsonify({
        'success': True,
        'feature_id': feature_id,
        'is_enabled': feature.is_enabled
    })

@system_bp.route('/features/<int:feature_id>', methods=['DELETE'])
@require_admin_session
@require_csrf
def admin_delete_feature(feature_id):
    """Delete feature"""
    feature = LoaderFeature.query.get_or_404(feature_id)
    
    db.session.delete(feature)
    db.session.commit()
    
    return jsonify({
        'success': True,
        'message': 'Feature deleted'
    })

# ========== CONFIG MANAGEMENT ==========

@system_bp.route('/config', methods=['GET'])
@require_admin_session
def admin_get_all_config():
    """Get all configuration"""
    configs = LoaderConfig.query.all()
    
    # Group by category
    grouped = {}
    for cfg in configs:
        if cfg.category not in grouped:
            grouped[cfg.category] = []
        grouped[cfg.category].append(cfg.to_dict())
    
    return jsonify({
        'total': len(configs),
        'config': grouped
    })

@system_bp.route('/config/set', methods=['POST'])
@require_admin_session
@require_csrf
def admin_set_config():
    """Set configuration value"""
    data = request.json
    key = data.get('key')
    value = data.get('value')
    
    if not key:
        return jsonify({'error': 'key is required'}), 400
    
    config = LoaderConfig.query.filter_by(key=key).first()
    
    if config:
        # Update existing
        if isinstance(value, bool):
            config.value = 'true' if value else 'false'
            config.value_type = 'bool'
        elif isinstance(value, int):
            config.value = str(value)
            config.value_type = 'int'
        elif isinstance(value, (dict, list)):
            config.value = json.dumps(value)
            config.value_type = 'json'
        else:
            config.value = str(value)
            config.value_type = 'string'
        
        config.updated_at = utc_now()
    else:
        # Create new
        value_type = 'string'
        if isinstance(value, bool):
            value = 'true' if value else 'false'
            value_type = 'bool'
        elif isinstance(value, int):
            value = str(value)
            value_type = 'int'
        elif isinstance(value, (dict, list)):
            value = json.dumps(value)
            value_type = 'json'
        else:
            value = str(value)
        
        config = LoaderConfig(
            key=key,
            value=value,
            value_type=value_type,
            description=data.get('description'),
            category=data.get('category', 'general')
        )
        db.session.add(config)
    
    db.session.commit()
    
    return jsonify({
        'success': True,
        'config': config.to_dict()
    })

@system_bp.route('/config/<int:config_id>', methods=['DELETE'])
@require_admin_session
@require_csrf
def admin_delete_config(config_id):
    """Delete configuration"""
    config = LoaderConfig.query.get_or_404(config_id)
    
    db.session.delete(config)
    db.session.commit()
    
    return jsonify({
        'success': True,
        'message': 'Config deleted'
    })

# ========== MAINTENANCE ==========

@system_bp.route('/maintenance/cleanup', methods=['POST'])
@require_admin_session
@require_csrf
def maintenance_cleanup():
    """Cleanup expired tokens and old logs"""
    expired_tokens = SessionToken.query.filter(
        SessionToken.expires_at < utc_now()
    ).delete()
    
    thirty_days_ago = utc_now() - timedelta(days=30)
    old_attempts = LoginAttempt.query.filter(
        LoginAttempt.timestamp < thirty_days_ago
    ).delete()
    
    seven_days_ago = utc_now() - timedelta(days=7)
    old_validations = ValidationLog.query.filter(
        ValidationLog.timestamp < seven_days_ago
    ).delete()
    
    db.session.commit()
    
    return jsonify({
        'success': True,
        'cleaned': {
            'expired_tokens': expired_tokens,
            'old_login_attempts': old_attempts,
            'old_validations': old_validations
        }
    })
