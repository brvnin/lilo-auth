from flask import Blueprint, request, jsonify
from api.extensions import db
from api.models.bot import GuildSettings, SavedEmbed
from api.utils.decorators import require_admin_session, require_csrf
from sqlalchemy import text
import json

bot_bp = Blueprint('bot', __name__)

@bot_bp.route('/stats', methods=['GET'])
@require_admin_session
def get_bot_stats():
    """Get global bot statistics"""
    # Raw SQL queries for aggregate stats
    total_tickets = db.session.execute(text("SELECT COUNT(*) FROM tickets")).scalar()
    open_tickets = db.session.execute(text("SELECT COUNT(*) FROM tickets WHERE status = 'open'")).scalar()
    total_invites_tracked = db.session.execute(text("SELECT SUM(total_invites) FROM invite_stats")).scalar() or 0
    total_embeds = SavedEmbed.query.count()
    
    return jsonify({
        'tickets': {
            'total': total_tickets,
            'open': open_tickets
        },
        'invites_tracked': total_invites_tracked,
        'saved_embeds': total_embeds
    })

@bot_bp.route('/settings/<guild_id>', methods=['GET'])
@require_admin_session
def get_guild_settings(guild_id):
    """Get settings for a specific guild"""
    settings = GuildSettings.query.filter_by(guild_id=int(guild_id)).first()
    if not settings:
        return jsonify({'message': 'Settings not found', 'defaults': True}), 200
        
    return jsonify(settings.to_dict())

@bot_bp.route('/settings/<guild_id>', methods=['PUT'])
@require_admin_session
@require_csrf
def update_guild_settings(guild_id):
    """Update settings for a guild"""
    data = request.json
    settings = GuildSettings.query.filter_by(guild_id=int(guild_id)).first()
    
    if not settings:
        settings = GuildSettings(guild_id=int(guild_id))
        db.session.add(settings)
    
    if 'anti_spam_enabled' in data:
        settings.anti_spam_enabled = data['anti_spam_enabled']
    if 'anti_links_enabled' in data:
        settings.anti_links_enabled = data['anti_links_enabled']
    if 'anti_raid_enabled' in data:
        settings.anti_raid_enabled = data['anti_raid_enabled']
    if 'min_account_age_days' in data:
        settings.min_account_age_days = data['min_account_age_days']
        
    db.session.commit()
    return jsonify(settings.to_dict())

@bot_bp.route('/embeds/<int:guild_id>', methods=['GET'])
@require_admin_session
def get_guild_embeds(guild_id):
    """Get saved embeds for a guild"""
    from api.models.bot import SavedEmbed
    embeds = SavedEmbed.query.filter_by(guild_id=guild_id).all()
    return jsonify([e.to_dict() for e in embeds])

@bot_bp.route('/embeds/<int:guild_id>/<name>', methods=['POST'])
@require_admin_session
@require_csrf
def save_guild_embed(guild_id, name):
    """Save or update an embed template"""
    from api.models.bot import SavedEmbed
    data = request.json
    embed = SavedEmbed.query.filter_by(guild_id=guild_id, name=name).first()
    
    if not embed:
        embed = SavedEmbed(guild_id=guild_id, name=name)
        db.session.add(embed)
    
    embed.title = data.get('title')
    embed.description = data.get('description')
    
    # Convert HEX to INT for color
    color_hex = data.get('color', '#000000').lstrip('#')
    try:
        embed.color = int(color_hex, 16)
    except ValueError:
        embed.color = 0

    embed.image_url = data.get('image_url')
    embed.thumbnail_url = data.get('thumbnail_url')
    embed.footer_text = data.get('footer_text')
    
    if 'fields' in data:
        embed.fields = json.dumps(data['fields'])
        
    db.session.commit()
    return jsonify(embed.to_dict())


# Moderation: Warnings
@bot_bp.route('/warnings/<int:user_id>', methods=['GET'])
@require_admin_session
def get_user_warnings(user_id):
    guild_id = request.args.get('guild_id', type=int)
    from api.models.bot import Warning
    warns = Warning.query.filter_by(user_id=user_id, guild_id=guild_id).order_by(Warning.created_at.desc()).all()
    return jsonify([{
        'id': w.id,
        'moderator_id': str(w.moderator_id),
        'reason': w.reason,
        'created_at': w.created_at.isoformat()
    } for w in warns])

@bot_bp.route('/warnings/<int:user_id>', methods=['DELETE'])
@require_admin_session
@require_csrf
def clear_user_warnings(user_id):
    guild_id = request.args.get('guild_id', type=int)
    from api.models.bot import Warning
    Warning.query.filter_by(user_id=user_id, guild_id=guild_id).delete()
    db.session.commit()
    return jsonify({'msg': 'Warnings cleared'})

# Security: Word Blacklist
@bot_bp.route('/blacklist/<int:guild_id>', methods=['GET'])
@require_admin_session
def get_guild_blacklist(guild_id):
    from api.models.bot import BlacklistWord
    words = BlacklistWord.query.filter_by(guild_id=guild_id).all()
    return jsonify([w.word for w in words])

@bot_bp.route('/blacklist/<int:guild_id>', methods=['POST'])
@require_admin_session
@require_csrf
def add_blacklist_item(guild_id):
    data = request.json
    word = data.get('word')
    if not word: return jsonify({'error': 'Word required'}), 400
    
    from api.models.bot import BlacklistWord
    if BlacklistWord.query.filter_by(guild_id=guild_id, word=word.lower()).first():
        return jsonify({'msg': 'Word already blacklisted'})
        
    new_word = BlacklistWord(guild_id=guild_id, word=word.lower())
    db.session.add(new_word)
    db.session.commit()
    return jsonify({'msg': 'Word added'})

@bot_bp.route('/blacklist/<int:guild_id>/remove', methods=['POST'])
@require_admin_session
@require_csrf
def remove_blacklist_item(guild_id):
    data = request.json
    word = data.get('word')
    from api.models.bot import BlacklistWord
    BlacklistWord.query.filter_by(guild_id=guild_id, word=word.lower()).delete()
    db.session.commit()
    return jsonify({'msg': 'Word removed'})

# Automation: Auto Messages
@bot_bp.route('/automation/<int:guild_id>', methods=['GET'])
@require_admin_session
def get_guild_automation(guild_id):
    from api.models.bot import AutoMessage
    auto = AutoMessage.query.get(guild_id)
    if not auto: 
        auto = AutoMessage(guild_id=guild_id)
        db.session.add(auto)
        db.session.commit()
    return jsonify({
        'welcome_channel_id': str(auto.welcome_channel_id) if auto.welcome_channel_id else None,
        'welcome_message': auto.welcome_message,
        'welcome_embed_id': auto.welcome_embed_id,
        'goodbye_channel_id': str(auto.goodbye_channel_id) if auto.goodbye_channel_id else None,
        'goodbye_message': auto.goodbye_message,
        'goodbye_embed_id': auto.goodbye_embed_id
    })

@bot_bp.route('/automation/<int:guild_id>', methods=['PUT'])
@require_admin_session
@require_csrf
def update_guild_automation(guild_id):
    data = request.json
    from api.models.bot import AutoMessage
    auto = AutoMessage.query.get(guild_id)
    if not auto:
        auto = AutoMessage(guild_id=guild_id)
        db.session.add(auto)
    
    if 'welcome_channel_id' in data: auto.welcome_channel_id = int(data['welcome_channel_id']) if data['welcome_channel_id'] else None
    if 'welcome_message' in data: auto.welcome_message = data['welcome_message']
    if 'welcome_embed_id' in data: auto.welcome_embed_id = data['welcome_embed_id']
    if 'goodbye_channel_id' in data: auto.goodbye_channel_id = int(data['goodbye_channel_id']) if data['goodbye_channel_id'] else None
    if 'goodbye_message' in data: auto.goodbye_message = data['goodbye_message']
    if 'goodbye_embed_id' in data: auto.goodbye_embed_id = data['goodbye_embed_id']
    
    db.session.commit()
    return jsonify({'status': 'success'})

# Logs Configuration
@bot_bp.route('/logs/<int:guild_id>', methods=['GET'])
@require_admin_session
def get_guild_logs_config(guild_id):
    from api.models.bot import LogConfig
    log = LogConfig.query.get(guild_id)
    if not log:
        log = LogConfig(guild_id=guild_id)
        db.session.add(log)
        db.session.commit()
    return jsonify({
        'msg_log_channel': str(log.msg_log_channel) if log.msg_log_channel else None,
        'member_log_channel': str(log.member_log_channel) if log.member_log_channel else None,
        'voice_log_channel': str(log.voice_log_channel) if log.voice_log_channel else None,
        'mod_log_channel': str(log.mod_log_channel) if log.mod_log_channel else None,
        'server_log_channel': str(log.server_log_channel) if log.server_log_channel else None
    })

@bot_bp.route('/logs/<int:guild_id>', methods=['PUT'])
@require_admin_session
@require_csrf
def update_guild_logs_config(guild_id):
    data = request.json
    from api.models.bot import LogConfig
    log = LogConfig.query.get(guild_id)
    if not log:
        log = LogConfig(guild_id=guild_id)
        db.session.add(log)
    
    if 'msg_log_channel' in data: log.msg_log_channel = int(data['msg_log_channel']) if data['msg_log_channel'] else None
    if 'member_log_channel' in data: log.member_log_channel = int(data['member_log_channel']) if data['member_log_channel'] else None
    if 'voice_log_channel' in data: log.voice_log_channel = int(data['voice_log_channel']) if data['voice_log_channel'] else None
    if 'mod_log_channel' in data: log.mod_log_channel = int(data['mod_log_channel']) if data['mod_log_channel'] else None
    if 'server_log_channel' in data: log.server_log_channel = int(data['server_log_channel']) if data['server_log_channel'] else None
    
    db.session.commit()
    return jsonify({'status': 'success'})

# Cache & Data Fetching
@bot_bp.route('/guilds', methods=['GET'])
@require_admin_session
def get_bot_guilds():
    """Get list of guilds from cache"""
    from api.models.bot import BotGuild
    guilds = BotGuild.query.all()
    return jsonify([{
        'id': str(g.guild_id),
        'name': g.name,
        'icon': g.icon_url
    } for g in guilds])

@bot_bp.route('/channels/<int:guild_id>', methods=['GET'])
@require_admin_session
def get_guild_channels(guild_id):
    """Get list of channels for a guild from cache"""
    from api.models.bot import BotChannel
    channels = BotChannel.query.filter_by(guild_id=guild_id).all()
    return jsonify([{
        'id': str(c.channel_id),
        'name': c.name,
        'type': c.type
    } for c in channels])

@bot_bp.route('/logs/<int:guild_id>/real', methods=['GET'])
@require_admin_session
def get_real_logs(guild_id):
    """Get real system logs from database"""
    from api.models.bot import SystemLog
    limit = request.args.get('limit', default=50, type=int)
    logs = SystemLog.query.filter_by(guild_id=guild_id).order_by(SystemLog.created_at.desc()).limit(limit).all()
    return jsonify([{
        'id': l.id,
        'type': l.type,
        'content': l.content,
    } for l in logs])

@bot_bp.route('/embeds/send', methods=['POST'])
@require_admin_session
@require_csrf
def send_bot_embed():
    """Queue a task for the bot to send an embed"""
    data = request.json
    guild_id = data.get('guild_id')
    channel_id = data.get('channel_id')
    embed_name = data.get('embed_name')
    
    if not all([guild_id, channel_id, embed_name]):
        return jsonify({'error': 'Missing parameters'}), 400
        
    # Fetch the embed template
    embed = SavedEmbed.query.filter_by(guild_id=guild_id, name=embed_name).first()
    if not embed:
        return jsonify({'error': 'Embed template not found'}), 404
        
    # Queue the task
    task_payload = {
        'message': data.get('message', ''),
        'embed': {
            'title': embed.title,
            'description': embed.description,
            'color': f"#{embed.color:06x}" if (embed.color and embed.color > 0) else "#000000",
            'image_url': embed.image_url,
            'footer_text': embed.footer_text
        }
    }
    
    db.session.execute(
        text("INSERT INTO bot_tasks (guild_id, channel_id, type, payload) VALUES (:g, :c, :t, :p)"),
        {
            'g': int(guild_id), 
            'c': int(channel_id), 
            't': 'send_embed', 
            'p': json.dumps(task_payload)
        }
    )
    db.session.commit()
    
    return jsonify({'status': 'queued', 'message': 'Embed send task queued'})

@bot_bp.route('/resync/<int:guild_id>', methods=['POST'])
@require_admin_session
@require_csrf
def resync_bot_cache(guild_id):
    """Queue a task for the bot to refresh its guild/channel cache"""
    db.session.execute(
        text("INSERT INTO bot_tasks (guild_id, channel_id, type, payload) VALUES (:g, 0, :t, :p)"),
        {
            'g': guild_id, 
            't': 'resync_cache', 
            'p': json.dumps({})
        }
    )
    db.session.commit()
    return jsonify({'status': 'queued', 'message': 'Cache resync task queued'})
@bot_bp.route('/debug/db')
@require_admin_session
def debug_bot_db():
    """Debug endpoint to see if tables are populated and settings are saved"""
    from api.models.bot import BotGuild, BotChannel, GuildSettings, AutoMessage, LogConfig
    guild_id = 1448075479708991 # The guild from user's screenshot
    
    guilds = BotGuild.query.all()
    channels = BotChannel.query.filter_by(guild_id=guild_id).all()
    
    settings = GuildSettings.query.get(guild_id)
    auto = AutoMessage.query.get(guild_id)
    logs = LogConfig.query.get(guild_id)
    
    return jsonify({
        'guilds': [{ 'id': str(g.guild_id), 'name': g.name } for g in guilds],
        'target_guild': {
            'id': str(guild_id),
            'settings': settings.to_dict() if settings else None,
            'automation': {
                'welcome_channel': str(auto.welcome_channel_id) if auto.welcome_channel_id else None,
                'welcome_message': auto.welcome_message,
                'goodbye_channel': str(auto.goodbye_channel_id) if auto.goodbye_channel_id else None
            } if auto else None,
            'log_config': {
                'msg': str(logs.msg_log_channel) if logs.msg_log_channel else None,
                'member': str(logs.member_log_channel) if logs.member_log_channel else None,
                'mod': str(logs.mod_log_channel) if logs.mod_log_channel else None
            } if logs else None
        },
        'channels_count': len(channels),
        'sample_channels': [{ 'id': str(c.channel_id), 'name': c.name, 'type': c.type } for c in channels[:10]]
    })
