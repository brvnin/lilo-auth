from collections import defaultdict
import threading
import time

class InMemoryRateLimiter:
    """Custom rate limiter with sliding window"""
    def __init__(self):
        self.requests = defaultdict(list)
        self.lock = threading.Lock()
        self.cleanup_interval = 300
        self.last_cleanup = time.time()
    
    def is_allowed(self, key: str, limit: int, window: int) -> tuple:
        """
        Check if request is allowed
        Returns: (is_allowed: bool, retry_after: int)
        """
        now = time.time()
        
        with self.lock:
            if now - self.last_cleanup > self.cleanup_interval:
                self._cleanup(now)
                self.last_cleanup = now
            
            if key not in self.requests:
                self.requests[key] = []
            
            cutoff = now - window
            self.requests[key] = [ts for ts in self.requests[key] if ts > cutoff]
            
            if len(self.requests[key]) >= limit:
                oldest = self.requests[key][0]
                retry_after = int(window - (now - oldest)) + 1
                return False, retry_after
            
            self.requests[key].append(now)
            return True, 0
    
    def _cleanup(self, current_time: float):
        """Remove all expired entries"""
        max_window = 3600
        cutoff = current_time - max_window
        
        keys_to_delete = []
        for key, timestamps in self.requests.items():
            self.requests[key] = [ts for ts in timestamps if ts > cutoff]
            if not self.requests[key]:
                keys_to_delete.append(key)
        
        for key in keys_to_delete:
            del self.requests[key]
    
    def reset(self, key: str):
        """Reset rate limit for a key"""
        with self.lock:
            if key in self.requests:
                del self.requests[key]

class BruteForceProtection:
    """Enhanced brute force protection with progressive delays"""
    def __init__(self):
        self.failed_attempts = defaultdict(list)
        self.blocked_until = {}
        self.lock = threading.Lock()
    
    def check_and_record(self, username: str, ip: str, success: bool) -> tuple:
        """
        Check if request should be blocked and record attempt
        Returns: (is_blocked: bool, reason: str, retry_after: int)
        """
        key = f"{username}:{ip}"
        now = time.time()
        
        with self.lock:
            # Check if currently blocked
            if key in self.blocked_until:
                if now < self.blocked_until[key]:
                    retry_after = int(self.blocked_until[key] - now)
                    return True, f"Too many failed attempts. Blocked for {retry_after} seconds.", retry_after
                else:
                    del self.blocked_until[key]
                    self.failed_attempts[key] = []
            
            if success:
                if key in self.failed_attempts:
                    del self.failed_attempts[key]
                return False, None, 0
            
            # Failed attempt
            if key not in self.failed_attempts:
                self.failed_attempts[key] = []
            
            cutoff = now - 900  # 15 minutes
            self.failed_attempts[key] = [ts for ts in self.failed_attempts[key] if ts > cutoff]
            self.failed_attempts[key].append(now)
            
            attempt_count = len(self.failed_attempts[key])
            
            # Progressive blocking
            if attempt_count >= 10:
                block_duration = 900  # 15 minutes
                self.blocked_until[key] = now + block_duration
                return True, "Account locked for 15 minutes. Too many failed attempts.", block_duration
            
            elif attempt_count >= 7:
                block_duration = 300  # 5 minutes
                self.blocked_until[key] = now + block_duration
                return True, "Too many failed attempts. Try again in 5 minutes.", block_duration
            
            elif attempt_count >= 5:
                block_duration = 60  # 1 minute
                self.blocked_until[key] = now + block_duration
                return True, "Too many failed attempts. Try again in 1 minute.", block_duration
            
            elif attempt_count >= 3:
                return False, f"Warning: {attempt_count} failed attempts. Account will be locked after 5 failures.", 0
            
            return False, None, 0
    
    def reset(self, username: str, ip: str):
        """Reset protection"""
        key = f"{username}:{ip}"
        with self.lock:
            if key in self.failed_attempts:
                del self.failed_attempts[key]
            if key in self.blocked_until:
                del self.blocked_until[key]

# Global instances
custom_limiter = InMemoryRateLimiter()
brute_force = BruteForceProtection()
