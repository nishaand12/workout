"""Run the round 8 UI checks: the chain box, chain time and distance, phases, and built questionnaires."""
import os
import subprocess
import unittest


class Round8UiScriptTests(unittest.TestCase):
    def test_node_suite(self):
        root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        script = os.path.join(root, "tests", "round8_ui.test.js")
        result = subprocess.run(["node", script], cwd=root, capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stdout + "\n" + result.stderr)
        self.assertIn("round 8 ui tests passed", result.stdout)


if __name__ == "__main__":
    unittest.main()
