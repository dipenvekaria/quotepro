#!/usr/bin/env bash
# PreToolUse gate on `git commit`.
#
# "Evidence before assertions" is the house rule and it was still being
# self-assessed. This runs the two checks that catch what tsc alone cannot:
# type errors, and a SQL statement touching company data without a company_id
# predicate. Exit 2 blocks the commit and hands stderr back as the reason.
#
# Skipped for docs- and skills-only commits: blocking a README edit on a
# 12-second typecheck teaches people to pass --no-verify.
set -uo pipefail
cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0

staged=$(git diff --cached --name-only 2>/dev/null)
[ -z "$staged" ] && exit 0

if ! grep -qvE '^(docs/|\.claude/|README|CLAUDE\.md|.*\.md$)' <<<"$staged"; then
  exit 0
fi

fail=""
if ! tsc_out=$(npx tsc --noEmit 2>&1); then
  fail+=$'tsc --noEmit failed:\n'"$(head -20 <<<"$tsc_out")"$'\n\n'
fi
if ! ten_out=$(npx vitest run tests/tenancy.test.ts 2>&1); then
  fail+=$'tenancy scan failed — a statement touches company data without a company_id predicate:\n'"$(grep -A6 'AssertionError\|touch company data' <<<"$ten_out" | head -20)"
fi

if [ -n "$fail" ]; then
  printf 'Commit blocked by the pre-commit gate.\n\n%s\n' "$fail" >&2
  exit 2
fi
exit 0
