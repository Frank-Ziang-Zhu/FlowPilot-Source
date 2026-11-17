"""Build the Windows x64 portable ZIP using the official Python embed package.
Run from any directory: python tools/build_windows.py
Requires network access to python.org on the build machine only.
"""
from pathlib import Path
from urllib.request import urlopen
import hashlib
import shutil
import tempfile
import zipfile

ROOT = Path(__file__).resolve().parents[1]
URL = 'https://www.python.org/ftp/python/3.13.7/python-3.13.7-embed-amd64.zip'
SHA = 'f6cca216a359be84797cabb54149ce5e062afb16cc7567eb7fc51cacb2d86b65'

def main():
    dist = ROOT / 'dist'
    dist.mkdir(exist_ok=True)
    target = dist / 'FlowPilot-Windows-x64-v1.0.0.zip'
    if target.exists():
        raise SystemExit('Output exists. Move the previous ZIP before building again.')
    with tempfile.TemporaryDirectory(prefix='flowpilot-build-') as temp:
        package = Path(temp) / 'FlowPilot-Windows-x64'
        for p in ROOT.rglob('*'):
            if not p.is_file():
                continue
            rel = p.relative_to(ROOT)
            if any(x in rel.parts for x in ('.git', 'dist', 'runtime', '__pycache__', '.venv', 'reference')):
                continue
            if rel.parts[0] in ('blender', 'tools') or p.suffix in ('.blend', '.blend1', '.pyc', '.zip'):
                continue
            dst = package / rel
            dst.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(p, dst)
        archive = Path(temp) / 'python.zip'
        with urlopen(URL, timeout=120) as response:
            archive.write_bytes(response.read())
        if hashlib.sha256(archive.read_bytes()).hexdigest() != SHA:
            raise SystemExit('Official Python ZIP checksum mismatch.')
        runtime = package / 'runtime'
        with zipfile.ZipFile(archive) as z:
            z.extractall(runtime)
        (runtime / 'python313._pth').write_text('python313.zip\n.\n..\n', encoding='utf-8')
        (package / 'START_HERE.txt').write_text(
            'FlowPilot Windows x64\nExtract the entire ZIP, then double-click start_flowpilot.bat.\n'
            'No Python/Blender/SUMO installation is required. Keep the startup window open.\n'
            'For Chinese instructions see docs/QUICKSTART.txt.\n', encoding='utf-8')
        with zipfile.ZipFile(target, 'w', zipfile.ZIP_DEFLATED) as z:
            for p in sorted(package.rglob('*')):
                if p.is_file():
                    z.write(p, p.relative_to(package.parent).as_posix())
    print(target)

if __name__ == '__main__':
    main()
