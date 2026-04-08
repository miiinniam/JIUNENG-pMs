#!/usr/bin/env bash
# 启动 Vite，并在两个独立浏览器窗口中打开（便于内部端 / 代理端分窗调试）
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
URL="http://localhost:3000"

open_two_windows() {
  if [[ "$(uname -s)" != "Darwin" ]]; then
    echo "非 macOS：请手动打开两次 $URL"
    return 0
  fi
  if [[ -d "/Applications/Google Chrome.app" ]]; then
    open -na "Google Chrome" --args --new-window "$URL"
    open -na "Google Chrome" --args --new-window "$URL"
  elif [[ -d "/Applications/Microsoft Edge.app" ]]; then
    open -na "Microsoft Edge" --args --new-window "$URL"
    open -na "Microsoft Edge" --args --new-window "$URL"
  elif [[ -d "/Applications/Arc.app" ]]; then
    open -na "Arc" --args --new-window "$URL"
    open -na "Arc" --args --new-window "$URL"
  else
    open "$URL"
    open "$URL"
  fi
}

./node_modules/.bin/vite --port=3000 --host=0.0.0.0 &
VITE_PID=$!

for _ in $(seq 1 40); do
  if curl -s -o /dev/null --connect-timeout 1 "$URL" 2>/dev/null; then
    break
  fi
  sleep 0.25
done

open_two_windows

wait "$VITE_PID"
