"""Run the Build drag-and-letter order checks."""
import os
import subprocess
import unittest


class BuildOrderScriptTests(unittest.TestCase):
    def test_node_suite(self):
        root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        script = os.path.join(root, "tests", "test_build_order.js")
        result = subprocess.run(["node", script], cwd=root, capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stdout + "\n" + result.stderr)
        self.assertIn("build order ok", result.stdout)


if __name__ == "__main__":
    unittest.main()
