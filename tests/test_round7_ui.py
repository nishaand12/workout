"""Run the round 7 UI checks: typed titles, set 1 fill, chain rows, letter colours, and save queueing."""
import os
import subprocess
import unittest


class Round7UiScriptTests(unittest.TestCase):
    def test_node_suite(self):
        root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        script = os.path.join(root, "tests", "round7_ui.test.js")
        result = subprocess.run(["node", script], cwd=root, capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stdout + "\n" + result.stderr)
        self.assertIn("round 7 ui tests passed", result.stdout)


if __name__ == "__main__":
    unittest.main()
