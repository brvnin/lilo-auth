#!/usr/bin/env python3
"""
Database Setup & Migration Script for Auth System + Store
Supports: Neon.tech, Supabase, Aiven, Render Postgres, Local Postgres, SQLite.
"""

import sys
import os

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

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
        try:
            user_input = input("\nEnter Connection String (or ENTER for SQLite): ").strip()
            db_url = user_input if user_input else 'sqlite:///auth.db'
        except EOFError:
            db_url = 'sqlite:///auth.db'

    # Normalization
    if db_url.startswith('postgres://'):
        db_url = db_url.replace('postgres://', 'postgresql://', 1)
    
    os.environ['DATABASE_URL'] = db_url
    masked_url = db_url
    if '@' in db_url:
        proto_and_user = db_url.split('@')[0]
        host_and_db = db_url.split('@')[1]
        proto = proto_and_user.split('://')[0]
        masked_url = f"{proto}://*****@{host_and_db}"
    print(f"\n[*] Target Database: {masked_url}")

    # 2. Setup API Models & Schema
    print("\n--- [1/2] Initializing API (Loader & Auth Backend) ---")
    try:
        from api.main import create_app
        from api.extensions import db as api_db
        from api.utils.migrations import migrate_database

        api_app = create_app()
        with api_app.app_context():
            if 'postgresql' in db_url:
                try:
                    api_db.session.execute(api_db.text('CREATE SCHEMA IF NOT EXISTS api'))
                    api_db.session.commit()
                    print("[OK] Schema 'api' ensured.")
                except Exception as e:
                    api_db.session.rollback()
                    print(f"[-] Note on schema 'api': {e}")
            
            api_db.create_all()
            print("[OK] Tables in 'api' schema created.")

            migrate_database(api_app)
            print("[OK] API migrations applied.")

    except Exception as e:
        print(f"[!] Error initializing API database: {e}")
        import traceback
        traceback.print_exc()
        return False

    # 3. Setup Store Models & Schema
    print("\n--- [2/2] Initializing Store Backend ---")
    try:
        from store.backend.app import app as store_app, db as store_db, StoreUser
        from werkzeug.security import generate_password_hash
        from sqlalchemy import text

        with store_app.app_context():
            if 'postgresql' in db_url:
                try:
                    store_db.session.execute(text('CREATE SCHEMA IF NOT EXISTS store'))
                    store_db.session.commit()
                    print("[OK] Schema 'store' ensured.")
                except Exception as e:
                    store_db.session.rollback()
                    print(f"[-] Note on schema 'store': {e}")

            store_db.create_all()
            print("[OK] Tables in 'store' schema created.")

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
                print("[OK] Default Store Admin created: user 'admin' (pass: 'admin')")
            else:
                print("[OK] Store Admin user already exists.")

    except Exception as e:
        print(f"[!] Error initializing Store database: {e}")
        import traceback
        traceback.print_exc()
        return False

    # 4. Summary of Tables
    print("\n--- [Verification] Listing Tables in Database ---")
    try:
        from sqlalchemy import inspect
        with api_app.app_context():
            inspector = inspect(api_db.engine)
            if 'postgresql' in db_url:
                api_tables = inspector.get_table_names(schema='api')
                store_tables = inspector.get_table_names(schema='store')
                print(f"[OK] 'api' Schema Tables ({len(api_tables)}): {', '.join(api_tables)}")
                print(f"[OK] 'store' Schema Tables ({len(store_tables)}): {', '.join(store_tables)}")
            else:
                all_tables = inspector.get_table_names()
                print(f"[OK] Tables ({len(all_tables)}): {', '.join(all_tables)}")
    except Exception as e:
        print(f"[-] Table listing note: {e}")

    print("\n" + "=" * 65)
    print(" [OK] DATABASE SETUP COMPLETED SUCCESSFULLY!")
    print("      Your Neon PostgreSQL is 100% configured and ready.")
    print("=" * 65)
    return True

if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)
