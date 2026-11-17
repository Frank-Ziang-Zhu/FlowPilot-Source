#!/bin/sh
set -eu
cd "$(dirname "$0")"
exec "${FLOWPILOT_PYTHON:-python3}" -B server.py --open "$@"
