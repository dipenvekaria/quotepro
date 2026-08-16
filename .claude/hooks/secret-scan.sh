#!/usr/bin/env bash
# PreToolUse gate on `git push` and `gh pr create`.
#
# The GitHub repo is PUBLIC. Infrastructure identifiers have been published
# from this repo once already and had to be redacted. A push is the last moment
# anything can be stopped, so the scan happens here rather than at commit.
set -uo pipefail
cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0

base=$(git merge-base HEAD origin/main 2>/dev/null || echo "")
diff=$([ -n "$base" ] && git diff "$base"...HEAD 2>/dev/null || git diff origin/main 2>/dev/null)
[ -z "$diff" ] && exit 0
added=$(grep '^+' <<<"$diff" | grep -v '^+++')

hits=$(grep -inE 'sbp_[a-z0-9]{20,}|GOCSPX-[A-Za-z0-9_-]{10,}|sk-[A-Za-z0-9]{20,}|BEGIN [A-Z ]*PRIVATE KEY|eyJ[A-Za-z0-9_-]{30,}\.[A-Za-z0-9_-]{30,}|(api[_-]?key|secret|password)["'"'"']?\s*[:=]\s*["'"'"'][A-Za-z0-9_\-]{16,}' <<<"$added" \
  | grep -viE 'process\.env|example|placeholder|your[_-]|<[a-z]|\$\{|xxx|demo1234|postgres:postgres' | head -5)

if [ -n "$hits" ]; then
  printf 'Push blocked — the diff looks like it carries a secret, and this repo is PUBLIC.\n\n%s\n\nRemove it and rewrite the commit. If it is a false positive, say so and push manually.\n' "$hits" >&2
  exit 2
fi
exit 0
