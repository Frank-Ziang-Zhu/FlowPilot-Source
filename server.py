"""Portable local server with reduced ASM and optional licensed SUMO 22."""
from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
import tempfile
import argparse
import socket
import webbrowser
from engines.asm import simulate
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

HERE = Path(__file__).resolve().parent
CONFIG = json.loads((HERE / "config.json").read_text(encoding="utf-8"))
PROJECT_ROOT = Path(os.environ.get("SUMO_PROJECT_ROOT", CONFIG["sumo_project_root"]))
if not PROJECT_ROOT.is_absolute():
    PROJECT_ROOT = HERE / PROJECT_ROOT
SUMO_PYTHON = os.environ.get("SUMO_PYTHON", CONFIG.get("sumo_python", ""))
SUMO_PYTHONPATH = os.environ.get("SUMO_PYTHONPATH", CONFIG.get("sumo_pythonpath", ""))


class LocalHTTPServer(ThreadingHTTPServer):
    # Windows SO_REUSEADDR can allow a second process to bind the same port.
    # Reserve the address exclusively so the startup fallback selects a free port.
    allow_reuse_address = False

    def server_bind(self):
        if sys.platform == "win32":
            self.socket.setsockopt(socket.SOL_SOCKET, socket.SO_EXCLUSIVEADDRUSE, 1)
        super().server_bind()


def sumo_available():
    return bool(SUMO_PYTHON and Path(SUMO_PYTHON).is_file()
                and (PROJECT_ROOT / "examples-22" / "Python example.sumo").is_file())


class FlowPilotHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(HERE), **kwargs)

    def do_GET(self):
        if self.path.split("?", 1)[0] == "/api/status":
            self.reply_json(200, {"default_engine": CONFIG.get("default_engine", "asm"),
                                 "asm": {"available": True, "calibrated": False},
                                 "sumo": {"available": sumo_available(), "license_verified": False,
                                          "process": CONFIG.get("sumo_process", "a2o")}})
            return
        super().do_GET()

    def do_POST(self):
        if self.path not in ("/api/run", "/api/run-asm", "/api/run-sumo"):
            self.send_error(404, "Unknown endpoint")
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if length < 0 or length > 65536:
                raise ValueError("Request too large")
            payload = json.loads(self.rfile.read(length) or b"{}")
            engine = payload.get("engine", "asm") if self.path == "/api/run" else self.path.rsplit("-", 1)[-1]
            process = payload.get("process", "a2o")
            if engine not in ("asm", "sumo") or process not in ("a2o", "oxidation"):
                raise ValueError("Unsupported engine or process")
            if engine == "sumo" and process != CONFIG.get("sumo_process", "a2o"):
                raise ValueError("This SUMO example is A2O only. Use ASM or register a dedicated oxidation model.")
            result = {name: (run_sumo(name, payload.get(name, {})) if engine == "sumo"
                            else simulate(normalize_controls(payload.get(name, {})), payload.get("scenario"), process))
                      for name in ("baseline", "optimized")}
            result.update(engine=engine, process=process, calibrated=False if engine == "asm" else None)
            self.reply_json(200, result)
        except Exception as exc:  # Return the useful native/SUMO error to the UI.
            self.reply_json(500, {"error": str(exc)})

    def reply_json(self, status: int, body: dict):
        encoded = json.dumps(body, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(encoded)))
        self.end_headers()
        self.wfile.write(encoded)

    def end_headers(self):
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()


def run_sumo(name: str, controls: dict) -> dict:
    """Create a disposable project copy and run the exact SUMO 22 Python workflow."""
    example_dir = PROJECT_ROOT / "examples-22"
    source_project = example_dir / "Python example.sumo"
    if not Path(SUMO_PYTHON).is_file():
        raise RuntimeError(f"SUMO Python interpreter was not found: {SUMO_PYTHON}")
    if not source_project.is_file():
        raise RuntimeError(f"SUMO example project was not found: {source_project}")

    with tempfile.TemporaryDirectory(prefix=f"flowpilot-{name}-") as temp:
        run_dir = Path(temp)
        # SUMO's extract helpers expect the source model and supporting TSV files beside it.
        for item in example_dir.iterdir():
            if item.suffix.lower() in {".sumo", ".tsv"}:
                shutil.copy2(item, run_dir / item.name)
        runner = run_dir / "sumo_job.py"
        runner.write_text(RUNNER_SOURCE, encoding="utf-8")
        command = [str(SUMO_PYTHON), "-u", str(runner), json.dumps(normalize_controls(controls))]
        environment = os.environ.copy()
        environment["PYTHONPATH"] = os.pathsep.join(filter(None, (SUMO_PYTHONPATH, str(PROJECT_ROOT), environment.get("PYTHONPATH", ""))))
        environment["MPLBACKEND"] = "Agg"
        completed = subprocess.run(command, cwd=run_dir, env=environment, capture_output=True, text=True,
                                   timeout=int(CONFIG.get("sumo_timeout_seconds", 180)))
        marker = next((line for line in completed.stdout.splitlines() if line.startswith("FLOWPILOT_RESULT=")), None)
        if completed.returncode or marker is None:
            detail = (completed.stderr or completed.stdout)[-1600:]
            raise RuntimeError(f"SUMO {name} failed. {detail}")
        result = json.loads(marker.split("=", 1)[1])
        result["engine"] = "sumo"
        result["log"] = f"{name} job completed"
        return result


def normalize_controls(value: dict) -> dict:
    return {
        "air": max(0, min(5000, int(value.get("air", 3200)))),
        "volume": max(4000, min(9000, int(value.get("volume", 7000)))),
        "pump": max(40000, min(90000, int(value.get("pump", 72000)))),
        "forecast": bool(value.get("forecast", False)),
        "recycle": max(0, min(4, float(value.get("recycle", 2.0)))),
    }


RUNNER_SOURCE = r'''
import json, sys, time
import dynamita.scheduler as ds
import dynamita.tool as dtool

controls = json.loads(sys.argv[1])
result = {"t": [], "snhx": [], "snox": []}

def data_callback(job, data):
    result["t"].append(data["Sumo__Time"] / dtool.day)
    result["snhx"].append(data["Sumo__Plant__CSTR3__SNHx"])
    result["snox"].append(data["Sumo__Plant__CSTR3__SNOx"])

def msg_callback(job, msg):
    if ds.sumo.isSimFinishedMsg(msg):
        ds.sumo.finish(job)

dtool.extract_dll_from_project("Python example.sumo", "sumoproject.dll")
dtool.extract_parameters_from_project("Python example.sumo", ".", "init.scs", "")
ds.sumo.setParallelJobs(1)
ds.sumo.message_callback = msg_callback
ds.sumo.datacomm_callback = data_callback
commands = [
    "execute init.scs",
    "set Sumo__Plant__CSTR2__param__Qair_NTP %s" % controls["air"],
    "set Sumo__Plant__CSTR3__param__L_Vtrain %s" % controls["volume"],
    "set Sumo__Plant__Sideflowdivider__param__Qpumped_target %s" % controls["pump"],
    "set Sumo__StopTime %s" % dtool.day,
    "set Sumo__DataComm %s" % dtool.hour,
    "mode dynamic", "start",
]
ds.sumo.schedule("sumoproject.dll", commands, ["Sumo__Time", "Sumo__Plant__CSTR3__SNHx", "Sumo__Plant__CSTR3__SNOx"], jobData={ds.sumo.persistent: True})
while ds.sumo.scheduledJobs > 0:
    time.sleep(.1)
ds.sumo.cleanup()
print("FLOWPILOT_RESULT=" + json.dumps({**result, "samples": len(result["t"])}))
'''


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=int(os.environ.get("FLOWPILOT_PORT", CONFIG.get("port", 8787))))
    parser.add_argument("--open", action="store_true")
    args = parser.parse_args()
    server = None
    for port in range(args.port, args.port + 20):
        try:
            server = LocalHTTPServer(("127.0.0.1", port), FlowPilotHandler)
            break
        except OSError:
            continue
    if server is None:
        raise SystemExit("No free local port. Try --port 8890.")
    url = f"http://127.0.0.1:{server.server_port}/?v=20261005#overview"
    print(f"FlowPilot: {url}\nDefault engine: reduced ASM. Keep this terminal open.", flush=True)
    if args.open:
        webbrowser.open(url)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
