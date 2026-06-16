#!/usr/bin/env bash
# Local dev server. Either run this or:  python3 -m http.server 8000
PORT="${1:-8000}"
echo "→ atlas serving at http://localhost:${PORT}/"
python3 -m http.server "${PORT}"
