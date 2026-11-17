import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from server import LocalHTTPServer, FlowPilotHandler


class PortableServerTests(unittest.TestCase):
    def test_occupied_port_is_not_shared(self):
        server = LocalHTTPServer(('127.0.0.1', 0), FlowPilotHandler)
        try:
            with self.assertRaises(OSError):
                second = LocalHTTPServer(server.server_address, FlowPilotHandler)
                second.server_close()
        finally:
            server.server_close()


if __name__ == '__main__':
    unittest.main()
