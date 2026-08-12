#!/usr/bin/env bash
#
# sync-tunnels.sh — keep .env.local in sync with Cloudflare quick-tunnel URLs.
#
# Quick tunnels (`cloudflared tunnel --url http://localhost:PORT`) get a fresh
# random *.trycloudflare.com hostname every time they start, which repeatedly
# leaves NEXT_PUBLIC_SUPABASE_URL pointing at a dead
# host (the usual "login suddenly broke" cause). This script reads the CURRENT
# public URL of each running tunnel — via its /quicktunnel metrics endpoint —
# and rewrites the matching env vars. No copy-pasting URLs.
#
# Usage:
#   scripts/sync-tunnels.sh            sync from already-running tunnels
#   scripts/sync-tunnels.sh --start    start any missing tunnels first, then sync
#   scripts/sync-tunnels.sh --restart  sync, then restart `next dev` on :3000
#
# Port -> env mapping:
#   54321  Supabase    -> NEXT_PUBLIC_SUPABASE_URL
#   3000   Next app    -> printed only (open this on your phone)

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$ROOT/.env.local"

SUPABASE_PORT=54321
FRONTEND_PORT=3000

START_MISSING=0
DO_RESTART=0
for arg in "$@"; do
  case "$arg" in
    --start)   START_MISSING=1 ;;
    --restart) DO_RESTART=1 ;;
    -h|--help) grep '^#' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) printf 'unknown option: %s\n' "$arg" >&2; exit 2 ;;
  esac
done

log()  { printf '%s\n' "$*"; }
warn() { printf '\033[33m! %s\033[0m\n' "$*" >&2; }
ok()   { printf '\033[32m✓ %s\033[0m\n' "$*"; }

# Public https URL for a running quick tunnel that targets local :PORT (or "").
tunnel_url_for_port() {
  local target=$1 pid aport meta host
  for pid in $(pgrep -f "cloudflared tunnel --url" 2>/dev/null || true); do
    aport=$(ps -p "$pid" -o args= 2>/dev/null | grep -oE ':[0-9]+' | tail -1 | tr -d ':')
    [ "$aport" = "$target" ] || continue
    for meta in $(lsof -nP -iTCP -sTCP:LISTEN -a -p "$pid" 2>/dev/null \
                    | grep -oE '127\.0\.0\.1:[0-9]+' | cut -d: -f2 | sort -u); do
      host=$(curl -s --max-time 2 "http://127.0.0.1:$meta/quicktunnel" 2>/dev/null \
               | sed -nE 's/.*"hostname":"([^"]+)".*/\1/p')
      [ -n "$host" ] && { printf 'https://%s' "$host"; return 0; }
    done
  done
  return 1
}

# Start a quick tunnel for :PORT and echo its URL once Cloudflare assigns one.
start_tunnel() {
  local port=$1 logf host i
  logf="$(mktemp -t "qp-tunnel-$port.XXXXXX")"
  nohup cloudflared tunnel --url "http://localhost:$port" >"$logf" 2>&1 &
  for i in $(seq 1 40); do
    host=$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' "$logf" 2>/dev/null | head -1)
    [ -n "$host" ] && { printf '%s' "$host"; return 0; }
    sleep 0.5
  done
  return 1
}

# Reuse a running tunnel for :PORT, or (with --start) create one. Echoes URL.
resolve_tunnel() {
  local port=$1 url
  if url="$(tunnel_url_for_port "$port")"; then printf '%s' "$url"; return 0; fi
  if [ "$START_MISSING" -eq 1 ]; then
    warn "no tunnel on :$port — starting one…"
    start_tunnel "$port" && return 0
  fi
  return 1
}

# Upsert KEY=VALUE in .env.local (preserving every other line).
set_env() {
  local key=$1 val=$2
  [ -f "$ENV_FILE" ] || : > "$ENV_FILE"
  if grep -qE "^$key=" "$ENV_FILE"; then
    sed -i.bak "s|^$key=.*|$key=$val|" "$ENV_FILE" && rm -f "$ENV_FILE.bak"
  else
    printf '%s=%s\n' "$key" "$val" >> "$ENV_FILE"
  fi
}

command -v cloudflared >/dev/null 2>&1 || { warn "cloudflared not found in PATH"; exit 1; }

changed=0

if supa_url="$(resolve_tunnel "$SUPABASE_PORT")"; then
  set_env NEXT_PUBLIC_SUPABASE_URL "$supa_url"; ok "NEXT_PUBLIC_SUPABASE_URL -> $supa_url"; changed=1
else
  warn "no Supabase tunnel on :$SUPABASE_PORT (re-run with --start). Left env unchanged."
fi

if front_url="$(resolve_tunnel "$FRONTEND_PORT")"; then
  log ""; ok "App URL (open on your phone): $front_url"
else
  warn "no frontend tunnel on :$FRONTEND_PORT (start one for phone access)."
fi

if [ "$DO_RESTART" -eq 1 ]; then
  log ""; log "Restarting next dev on :$FRONTEND_PORT…"
  lsof -ti tcp:"$FRONTEND_PORT" 2>/dev/null | xargs kill 2>/dev/null || true
  ( cd "$ROOT" && nohup npm run dev >/tmp/quotepro-next.log 2>&1 & )
  ok "next dev restarting (logs: /tmp/quotepro-next.log)"
elif [ "$changed" -eq 1 ]; then
  log ""; warn "NEXT_PUBLIC_* are inlined at build time — restart the dev server to apply:"
  log "    Ctrl-C the 'next dev' terminal, then: npm run dev   (or re-run this with --restart)"
fi
