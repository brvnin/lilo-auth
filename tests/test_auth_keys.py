import unittest
import json
import time
import hmac
import hashlib
from api.main import app
from api.config import Config
from api.extensions import db
from api.models import User, Product, License, UserProduct
from api.services.encryption import hash_password


class AuthKeyTestCase(unittest.TestCase):
    def setUp(self):
        self.app = app
        self.client = app.test_client()
        self.app_context = app.app_context()
        self.app_context.push()

    def tearDown(self):
        self.app_context.pop()

    def _sign_headers(self, method, path, json_body=""):
        ts = str(int(time.time()))
        payload = f"{ts}{method}{path}{json_body}"
        sig = hmac.new(Config.HMAC_SECRET.encode(), payload.encode(), hashlib.sha256).hexdigest()
        return {
            'Content-Type': 'application/json',
            'X-Loader-Timestamp': ts,
            'X-Loader-Signature': sig
        }

    def test_config_has_driver_key_part(self):
        self.assertTrue(hasattr(Config, 'DRIVER_KEY_PART'))
        self.assertGreater(len(Config.DRIVER_KEY_PART), 0)

    def test_health_check(self):
        res = self.client.get('/api/healthz')
        self.assertEqual(res.status_code, 200)


if __name__ == '__main__':
    unittest.main()
