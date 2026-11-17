import json
import math
import sys
import threading
import unittest
from pathlib import Path
from urllib.request import urlopen, Request

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from engines.asm import simulate
from server import FlowPilotHandler, ThreadingHTTPServer


class EngineTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.controls = {"air":3200, "pump":72000, "volume":7000, "recycle":2}
        cls.result = simulate(cls.controls)

    def test_hourly_finite_nonnegative(self):
        for key in ("t", "snhx", "snox", "cod", "do", "flow"):
            self.assertEqual(len(self.result[key]), 25)
            self.assertTrue(all(math.isfinite(v) and v >= 0 for v in self.result[key]))
        self.assertFalse(self.result["calibrated"])

    def test_air_has_physical_response(self):
        no_air = simulate({**self.controls, "air":0})
        self.assertGreater(sum(no_air["snhx"]), sum(self.result["snhx"]))
        self.assertLess(sum(no_air["do"]), sum(self.result["do"]))

    def test_load_and_process_change_response(self):
        high_load = simulate(self.controls, {"influentNh":65, "peakFlow":1800})
        self.assertGreater(sum(high_load["snhx"]), sum(self.result["snhx"]))
        other = simulate(self.controls, process="oxidation")
        self.assertNotEqual(other["snhx"], self.result["snhx"])

    def test_equal_controls_no_artificial_improvement(self):
        self.assertEqual(simulate(self.controls), self.result)
        self.assertEqual(self.controls["air"], 3200)

    def test_http_and_identical_scenarios(self):
        server = ThreadingHTTPServer(("127.0.0.1", 0), FlowPilotHandler)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        try:
            base = "http://127.0.0.1:" + str(server.server_port)
            status = json.load(urlopen(base + "/api/status"))
            self.assertTrue(status["asm"]["available"])
            request = Request(base + "/api/run", data=json.dumps({"engine":"asm", "baseline":self.controls,
                              "optimized":self.controls}).encode(), headers={"Content-Type":"application/json"})
            result = json.load(urlopen(request, timeout=30))
            self.assertEqual(result["baseline"], result["optimized"])
            self.assertEqual(result["engine"], "asm")
        finally:
            server.shutdown(); server.server_close(); thread.join()


if __name__ == "__main__":
    unittest.main()
