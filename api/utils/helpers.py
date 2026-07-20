from datetime import datetime, timezone

def utc_now():
    """Return current UTC datetime (timezone-aware)"""
    return datetime.now(timezone.utc)
