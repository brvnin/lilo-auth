from api.extensions import db
from flask import current_app
from sqlalchemy import text

def migrate_database(app):
    """Add missing columns to existing tables"""
    with app.app_context():

        try:
            inspector = db.inspect(db.engine)
            
            # 1. user_products table
            columns = [col['name'] for col in inspector.get_columns('user_products', schema='api')]
            
            if 'frozen_at' not in columns:
                print("Adding frozen_at column to user_products table...")
                with db.engine.connect() as conn:
                    conn.execute(text("ALTER TABLE api.user_products ADD COLUMN frozen_at TIMESTAMP NULL"))
                    conn.commit()
                print("Added frozen_at column")
            
            if 'days_remaining_when_frozen' not in columns:
                print("Adding days_remaining_when_frozen column to user_products table...")
                with db.engine.connect() as conn:
                    conn.execute(text("ALTER TABLE api.user_products ADD COLUMN days_remaining_when_frozen INTEGER NULL"))
                    conn.commit()
                print("Added days_remaining_when_frozen column")
                

        except Exception as e:
            error_msg = str(e).lower()
            if 'does not exist' not in error_msg and 'already exists' not in error_msg:
                print(f"Migration warning (user_products): {e}")

        try:
            inspector = db.inspect(db.engine)
            columns_products = [col['name'] for col in inspector.get_columns('products', schema='api')]
            
            if 'file_data' not in columns_products:
                print("Adding file_data column to products table...")
                with db.engine.connect() as conn:
                    if 'postgresql' in app.config['SQLALCHEMY_DATABASE_URI']:
                        conn.execute(text("ALTER TABLE api.products ADD COLUMN file_data BYTEA NULL"))
                    else:
                        conn.execute(text("ALTER TABLE api.products ADD COLUMN file_data BLOB NULL"))
                    conn.commit()
                print("Added file_data column")
                
            if 'file_path' not in columns_products:
                 print("Adding file_path column to products table...")
                 with db.engine.connect() as conn:
                     conn.execute(text("ALTER TABLE api.products ADD COLUMN file_path VARCHAR(255) NULL"))
                     conn.commit()
                 print("Added file_path column")
                 

        except Exception as e:
            error_msg = str(e).lower()
            if 'does not exist' not in error_msg and 'already exists' not in error_msg:
                print(f"Migration warning (products): {e}")

        try:
            inspector = db.inspect(db.engine)
            # 3. product_details table
            columns_details = [col['name'] for col in inspector.get_columns('product_details', schema='api')]
            
            if 'video_url' not in columns_details:
                print("Adding video_url column to product_details table...")
                with db.engine.connect() as conn:
                    conn.execute(text("ALTER TABLE api.product_details ADD COLUMN video_url VARCHAR(500) NULL"))
                    conn.commit()
                print("Added video_url column")
            
            if 'badge_text' not in columns_details:
                print("Adding badge_text column to product_details table...")
                with db.engine.connect() as conn:
                    conn.execute(text("ALTER TABLE api.product_details ADD COLUMN badge_text VARCHAR(50) NULL"))
                    conn.commit()
                print("Added badge_text column")

            if 'badge_color' not in columns_details:
                print("Adding badge_color column to product_details table...")
                with db.engine.connect() as conn:
                    conn.execute(text("ALTER TABLE api.product_details ADD COLUMN badge_color VARCHAR(7) DEFAULT '#FF0000'"))
                    conn.commit()
                print("Added badge_color column")

        except Exception as e:
            error_msg = str(e).lower()
            if 'does not exist' not in error_msg and 'already exists' not in error_msg:
                print(f"Migration warning (product_details): {e}")

        try:
            inspector = db.inspect(db.engine)
            
            # 4. guild_settings table migration
            if 'guild_settings' in inspector.get_table_names():
                columns_guild = [col['name'] for col in inspector.get_columns('guild_settings')]
                
                if 'anti_links_enabled' not in columns_guild:
                    print("Adding anti_links_enabled column to guild_settings table...")
                    with db.engine.connect() as conn:
                        conn.execute(text("ALTER TABLE guild_settings ADD COLUMN anti_links_enabled BOOLEAN DEFAULT FALSE"))
                        conn.commit()
                    print("Added anti_links_enabled column")

            # 5. Ensure bot-specific tables exist (db.create_all() usually handles this, but we can be explicit if needed)
            # We don't need to manually create them if db.create_all() is called in main.py, 
            # but we should check if they are missing.
            
        except Exception as e:
            print(f"Migration warning (guild_settings): {e}")
