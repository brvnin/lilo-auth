#!/usr/bin/env python3
"""
Database Setup & Migration Script for Auth System + Store
Supports: Neon.tech, Supabase, Aiven, Render Postgres, Local Postgres, SQLite.
"""

import sys
import os

# Add root directory and store/backend directory to sys.path
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
sys.path.insert(0, BASE_DIR)
sys.path.insert(0, os.path.join(BASE_DIR, 'store', 'backend'))

def main():
    print("=" * 65)
    print("       AUTH SYSTEM & STORE - DATABASE SETUP & MIGRATION")
    print("=" * 65)

    # 1. Get Database URL
    db_url = None
    if len(sys.argv) > 1:
        db_url = sys.argv[1]
    else:
        db_url = os.environ.get('DATABASE_URL')
    
    if not db_url:
        print("\n[!] No DATABASE_URL provided via argument or environment variable.")
        print("    Example: python setup_database.py \"postgresql://user:pass@ep-xyz.neon.tech/neondb?sslmode=require\"")
        print("    Or press ENTER to use local SQLite (sqlite:///auth.db):")
        try:
            user_input = input("\nEnter Connection String (or ENTER for SQLite): ").strip()
            db_url = user_input if user_input else 'sqlite:///auth.db'
        except EOFError:
            db_url = 'sqlite:///auth.db'

    # Normalization
    if db_url.startswith('postgres://'):
        db_url = db_url.replace('postgres://', 'postgresql://', 1)
    
    os.environ['DATABASE_URL'] = db_url
    print(f"\n[*] Target Database: {db_url.split('@')[-1] if '@' in db_url else db_url}")

    # 2. Setup API Models & Schema
    print("\n--- [1/2] Initializing API (Loader & Auth Backend) ---")
    try:
        from api.main import create_app
        from api.extensions import db as api_db
        from api.utils.migrations import migrate_database

        app = create_app()
        with app.app_context():
            # Create schema if postgres
            if 'postgresql' in db_url:
                try:
                    api_db.session.execute(api_db.text('CREATE SCHEMA IF NOT EXISTS api'))
                    api_db.session.commit()
                    print("[✓] Schema 'api' ensured.")
                except Exception as e:
                    api_db.session.rollback()
                    print(f"[-] Note on schema 'api': {e}")
            
            api_db.create_all()
            print("[✓] Tables in 'api' schema created.")

            # Run migrations
            migrate_database(app)
            print("[✓] API migrations applied.")

    except Exception as e:
        print(f"[!] Error initializing API database: {e}")
        return False

    # 3. Setup Store Models & Schema
    print("\n--- [2/2] Initializing Store Backend ---")
    try:
        # Import store app
        import importlib.util
        store_app_path = os.path.join(BASE_DIR, 'store', 'backend', 'app.py')
        
        from store.backend.models import db as store_db, StoreUser
        from werkzeug.security import generate_password_hash
        from sqlalchemy import text

        with app.app_context():
            if 'postgresql' in db_url:
                try:
                    store_db.session.execute(text('CREATE SCHEMA IF NOT EXISTS store'))
                    store_db.session.commit()
                    print("[✓] Schema 'store' ensured.")
                except Exception as e:
                    store_db.session.rollback()
                    print(f"[-] Note on schema 'store': {e}")

            store_db.create_all()
            print("[✓] Tables in 'store' schema created.")

            # Create default admin user in store if not exists
            admin = StoreUser.query.filter_by(username='admin').first()
            if not admin:
                default_admin = StoreUser(
                    username='admin',
                    email='admin@zzenith.local',
                    password_hash=generate_password_hash('admin'),
                    is_verified=True,
                    is_admin=True
                )
                store_db.session.add(default_admin)
                store_db.session.commit()
                print("[✓] Default Store Admin created: user 'admin' (pass: 'admin')")
            else:
                print("[✓] Store Admin user already exists.")

    except Exception as e:
        print(f"[!] Error initializing Store database: {e}")
        return False

    print("\n" + "=" * 65)
    print(" [✓] DATABASE SETUP COMPLETED SUCCESSFULLY!")
    print("     Your database is ready for Auth API, Admin Panel & Store.")
    print("=" * 65)
    return True

if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)
