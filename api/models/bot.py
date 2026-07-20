from api.extensions import db
from datetime import datetime
from sqlalchemy.dialects.postgresql import JSON

class GuildSettings(db.Model):
    __table_args__ = {'extend_existing': True} # Tables created by bot
    __tablename__ = 'guild_settings'
    
    guild_id = db.Column(db.BigInteger, primary_key=True)
    anti_spam_enabled = db.Column(db.Boolean, default=False)
    anti_links_enabled = db.Column(db.Boolean, default=False)
    anti_raid_enabled = db.Column(db.Boolean, default=False)
    min_account_age_days = db.Column(db.Integer, default=0)
    log_channel_id = db.Column(db.BigInteger, nullable=True)
    mute_role_id = db.Column(db.BigInteger, nullable=True)
    autorole_id = db.Column(db.BigInteger, nullable=True)
    
    def to_dict(self):
        return {
            'guild_id': str(self.guild_id),
            'anti_spam_enabled': self.anti_spam_enabled,
            'anti_links_enabled': self.anti_links_enabled,
            'anti_raid_enabled': self.anti_raid_enabled,
            'min_account_age_days': self.min_account_age_days,
            'log_channel_id': str(self.log_channel_id) if self.log_channel_id else None,
            'mute_role_id': str(self.mute_role_id) if self.mute_role_id else None
        }

class SavedEmbed(db.Model):
    __table_args__ = {'extend_existing': True}
    __tablename__ = 'saved_embeds'
    
    id = db.Column(db.Integer, primary_key=True)
    guild_id = db.Column(db.BigInteger, nullable=False)
    name = db.Column(db.Text, nullable=False)
    title = db.Column(db.Text)
    description = db.Column(db.Text)
    color = db.Column(db.Integer)
    image_url = db.Column(db.Text)
    thumbnail_url = db.Column(db.Text)
    footer_text = db.Column(db.Text)
    fields = db.Column(db.Text) # Stored as JSON string
    created_by = db.Column(db.BigInteger)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        import json
        return {
            'id': self.id,
            'guild_id': str(self.guild_id),
            'name': self.name,
            'title': self.title,
            'description': self.description,
            'color': f"#{self.color:06x}" if self.color else "#000000",
            'image_url': self.image_url,
            'thumbnail_url': self.thumbnail_url,
            'footer_text': self.footer_text,
            'fields': json.loads(self.fields) if self.fields else [],
            'created_at': self.created_at.isoformat()
        }

class Warning(db.Model):
    __tablename__ = 'moderation_warnings'
    id = db.Column(db.Integer, primary_key=True)
    guild_id = db.Column(db.BigInteger, nullable=False)
    user_id = db.Column(db.BigInteger, nullable=False)
    moderator_id = db.Column(db.BigInteger, nullable=False)
    reason = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class AutoMessage(db.Model):
    __tablename__ = 'auto_messages'
    guild_id = db.Column(db.BigInteger, primary_key=True)
    welcome_channel_id = db.Column(db.BigInteger)
    welcome_message = db.Column(db.Text)
    welcome_embed_id = db.Column(db.Integer, db.ForeignKey('saved_embeds.id'))
    goodbye_channel_id = db.Column(db.BigInteger)
    goodbye_message = db.Column(db.Text)
    goodbye_embed_id = db.Column(db.Integer, db.ForeignKey('saved_embeds.id'))

class LogConfig(db.Model):
    __tablename__ = 'log_config'
    guild_id = db.Column(db.BigInteger, primary_key=True)
    msg_log_channel = db.Column(db.BigInteger)
    member_log_channel = db.Column(db.BigInteger)
    voice_log_channel = db.Column(db.BigInteger)
    mod_log_channel = db.Column(db.BigInteger)
    server_log_channel = db.Column(db.BigInteger)

class CustomCommand(db.Model):
    __tablename__ = 'custom_commands'
    id = db.Column(db.Integer, primary_key=True)
    guild_id = db.Column(db.BigInteger, nullable=False)
    name = db.Column(db.Text, nullable=False)
    response = db.Column(db.Text, nullable=False)
    is_auto_reply = db.Column(db.Boolean, default=False)
    created_by = db.Column(db.BigInteger)

class BlacklistWord(db.Model):
    __tablename__ = 'word_blacklist'
    id = db.Column(db.Integer, primary_key=True)
    guild_id = db.Column(db.BigInteger, nullable=False)
    word = db.Column(db.Text, nullable=False)

class BotGuild(db.Model):
    __tablename__ = 'bot_guilds'
    guild_id = db.Column(db.BigInteger, primary_key=True)
    name = db.Column(db.Text, nullable=False)
    icon_url = db.Column(db.Text)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow)

class BotChannel(db.Model):
    __tablename__ = 'bot_channels'
    channel_id = db.Column(db.BigInteger, primary_key=True)
    guild_id = db.Column(db.BigInteger, nullable=False)
    name = db.Column(db.Text, nullable=False)
    type = db.Column(db.Text, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow)

class SystemLog(db.Model):
    __tablename__ = 'system_logs'
    id = db.Column(db.Integer, primary_key=True)
    guild_id = db.Column(db.BigInteger, nullable=False)
    type = db.Column(db.Text, nullable=False)
    content = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

