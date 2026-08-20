import unittest

from api.main import app


class HealthEndpointTestCase(unittest.TestCase):
    def setUp(self):
        self.client = app.test_client()

    def test_public_health_endpoint_returns_ok(self):
        response = self.client.get('/api/health')
        self.assertEqual(response.status_code, 200)
        self.assertIn('status', response.get_json())

    def test_keepalive_endpoint_returns_ok(self):
        response = self.client.get('/api/healthz')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()['status'], 'ok')


if __name__ == '__main__':
    unittest.main()
