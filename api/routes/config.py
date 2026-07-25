from flask import Blueprint, request, jsonify
from api.models.config import Config
from api.models.user import User
from api.extensions import db
import json

config_bp = Blueprint('config', __name__)

# O Loader vai enviar o token ou o username pra validar.
# Pra manter simples e compatível com a sua auth, vou assumir que o C++ manda o "username" 
# e um "hash" pra gente saber que é o client dele chamando (ou vc pode adaptar a auth dps).
# Como é uma estrutura de painel de admin + cheat, a melhor abordagem pra endpoint de client
# é pedir os parametros de login junto, ou usar um token JWT caso a API já trabalhe com.

@config_bp.route('/save', methods=['POST'])
def save_config():
    data = request.get_json()
    
    if not data:
        return jsonify({'success': False, 'message': 'No data provided'}), 400
        
    username = data.get('username')
    config_name = data.get('name')
    config_data = data.get('data') # This should be a JSON string or dict
    
    if not username or not config_name or not config_data:
        return jsonify({'success': False, 'message': 'Missing required fields'}), 400
        
    user = User.query.filter_by(username=username).first()
    if not user:
        return jsonify({'success': False, 'message': 'User not found'}), 404
        
    # Check if config already exists for this user with this name
    config = Config.query.filter_by(user_id=user.id, name=config_name).first()
    
    # Ensure data is stored as string
    if isinstance(config_data, dict):
        config_data = json.dumps(config_data)
        
    if config:
        # Update existing
        config.data = config_data
        message = 'Configuration updated successfully'
    else:
        # Create new
        config = Config(user_id=user.id, name=config_name, data=config_data)
        db.session.add(config)
        message = 'Configuration saved successfully'
        
    try:
        db.session.commit()
        return jsonify({
            'success': True,
            'message': message,
            'config_id': config.id
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

@config_bp.route('/list', methods=['GET'])
def list_configs():
    username = request.args.get('username')
    
    if not username:
        return jsonify({'success': False, 'message': 'Username is required'}), 400
        
    user = User.query.filter_by(username=username).first()
    if not user:
        return jsonify({'success': False, 'message': 'User not found'}), 404
        
    configs = Config.query.filter_by(user_id=user.id).all()
    
    config_list = [{
        'id': c.id,
        'name': c.name,
        'updated_at': c.updated_at.isoformat() if c.updated_at else None
    } for c in configs]
    
    return jsonify({
        'success': True,
        'configs': config_list
    }), 200

@config_bp.route('/load/<int:config_id>', methods=['GET'])
def load_config(config_id):
    username = request.args.get('username')
    
    if not username:
        return jsonify({'success': False, 'message': 'Username is required'}), 400
        
    user = User.query.filter_by(username=username).first()
    if not user:
        return jsonify({'success': False, 'message': 'User not found'}), 404
        
    config = Config.query.filter_by(id=config_id, user_id=user.id).first()
    if not config:
        return jsonify({'success': False, 'message': 'Configuration not found'}), 404
        
    return jsonify({
        'success': True,
        'config': {
            'id': config.id,
            'name': config.name,
            'data': config.data
        }
    }), 200

@config_bp.route('/delete/<int:config_id>', methods=['DELETE'])
def delete_config(config_id):
    # Em DELETE methods, os params vao em JSON ou Query string, 
    # pra ficar facil pro c++ chamar com json, usamos args se for json ou request
    data = request.get_json() or {}
    username = data.get('username') or request.args.get('username')
    
    if not username:
        return jsonify({'success': False, 'message': 'Username is required'}), 400
        
    user = User.query.filter_by(username=username).first()
    if not user:
        return jsonify({'success': False, 'message': 'User not found'}), 404
        
    config = Config.query.filter_by(id=config_id, user_id=user.id).first()
    if not config:
        return jsonify({'success': False, 'message': 'Configuration not found'}), 404
        
    try:
        db.session.delete(config)
        db.session.commit()
        return jsonify({
            'success': True,
            'message': 'Configuration deleted successfully'
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500
