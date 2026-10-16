"""Role-flag migrations must stay valid on Postgres, where login was 500ing."""
import os
import shutil
import subprocess
import sys
import unittest


ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


class PostgresSchemaLoginTests(unittest.TestCase):
    def test_role_flag_sql_uses_boolean_literals(self):
        with open(os.path.join(ROOT, "app", "main.py"), encoding="utf-8") as handle:
            src = handle.read()
        self.assertNotIn("BOOLEAN DEFAULT 0", src)
        self.assertNotIn("COALESCE(is_admin, 0)", src)
        self.assertNotIn("COALESCE(is_coach, 0)", src)
        self.assertNotIn("COALESCE(is_athlete, 0)", src)
        self.assertIn("BOOLEAN DEFAULT FALSE", src)

    def test_existing_coach_can_sign_in_after_postgres_migration(self):
        if not shutil.which("psql"):
            self.skipTest("postgres client is not installed")
        try:
            import psycopg
            psycopg.connect("dbname=postgres").close()
        except Exception as exc:
            self.skipTest(f"postgres unavailable: {exc}")
        script = os.path.join(os.path.dirname(__file__), "postgres_login_migration.py")
        subprocess.check_call([sys.executable, script], cwd=ROOT)


if __name__ == "__main__":
    unittest.main()
