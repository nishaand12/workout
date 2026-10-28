"""Static assets are versioned by content and cached; the page and API are not."""
import hashlib
import os
import re
import tempfile
import unittest

os.environ.setdefault("DATABASE_URL", "sqlite:///" + os.path.join(tempfile.mkdtemp(), "assets.db"))
os.environ["SUPABASE_URL"] = ""

from fastapi.testclient import TestClient  # noqa: E402

from app.database import Base, engine  # noqa: E402
from app.main import app, static_path  # noqa: E402


class AssetCachingTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        Base.metadata.create_all(bind=engine)
        cls.client = TestClient(app)

    def test_page_links_assets_by_content_hash(self):
        page = self.client.get("/")
        self.assertEqual(page.status_code, 200)
        self.assertEqual(page.headers["cache-control"], "no-cache")
        links = re.findall(r'"(/static/[\w./-]+\.(?:js|css))\?v=([0-9a-f]{12})"', page.text)
        self.assertEqual({path for path, _ in links}, {
            "/static/css/wourkout.css", "/static/css/ui.css", "/static/js/build-order.js", "/static/js/wourkout.js",
        })
        for path, version in links:
            with open(os.path.join(static_path, path[len("/static/"):]), "rb") as fh:
                self.assertEqual(version, hashlib.sha256(fh.read()).hexdigest()[:12], path)
        self.assertNotIn('.js"', page.text.replace("supabase-js@2", ""))

    def test_versioned_assets_are_cached_and_compressed(self):
        page = self.client.get("/").text
        url = re.search(r'"(/static/js/wourkout\.js\?v=[0-9a-f]+)"', page).group(1)
        res = self.client.get(url, headers={"Accept-Encoding": "gzip"})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.headers["cache-control"], "public, max-age=31536000, immutable")
        self.assertEqual(res.headers.get("content-encoding"), "gzip")
        plain = self.client.get("/static/js/wourkout.js")
        self.assertEqual(plain.headers["cache-control"], "no-cache")

    def test_api_responses_are_never_stored(self):
        res = self.client.get("/api/exercises")
        self.assertEqual(res.status_code, 401)
        self.assertEqual(res.headers["cache-control"], "no-store")
        self.assertEqual(self.client.get("/api/auth/config").headers["cache-control"], "no-store")


if __name__ == "__main__":
    unittest.main()
