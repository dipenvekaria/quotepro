# Claude Code Setup

Getting a new engineer to the point where their Claude Code behaves exactly like everyone
else's on this project. Fifteen minutes.

The goal is that nobody has to re-explain Rivet to an agent. The context, the rules, and the
workflows are committed to the repo, so they arrive with the clone.

## What's committed, and why it matters

| Path | What it does | Committed? |
| --- | --- | --- |
| `CLAUDE.md` | Loads automatically. Product summary, live/dead code map, the tenancy rule, commands, traps. | Yes |
| `.claude/skills/rivet-*/SKILL.md` | Six project skills. Claude invokes them by name or when the task matches. | Yes |
| `.claude/settings.json` | The team's plugin set. Everyone gets the same tooling. | Yes |
| `.claude/settings.local.json` | Your personal permission allowlist and overrides. | No — gitignored |
| `docs/*.md` | The detail `CLAUDE.md` links out to. | Yes |

Because these are in the repository, a `git clone` is most of the setup. The steps below cover
the rest.

---

## 1. Install Claude Code

```bash
curl -fsSL https://claude.ai/install.sh | bash
```

Or via npm if you'd rather manage it with Node:

```bash
npm install -g @anthropic-ai/claude-code
```

Verify:

```bash
claude --version
```

There are also desktop apps (macOS/Windows), a web app at claude.ai/code, and IDE extensions
for VS Code and JetBrains. They share the same config and the same repo files, so pick
whichever you like — the setup below applies to all of them.

## 2. Authenticate

```bash
claude
```

On first run it walks you through sign-in. Use your Anthropic account; a Claude Pro or Max
subscription or API billing covers usage.

## 3. Clone the repo — outside iCloud Drive

```bash
git clone https://github.com/dipenvekaria/quotepro.git ~/code/rivet
cd ~/code/rivet
git switch main
```

Two things that matter here:

**Not in iCloud Drive.** The original working copy lives under `~/Library/Mobile Documents/`,
where iCloud syncs every file operation. Installs crawl and `git` history walks can hang for
minutes. Clone somewhere local.

**`main`** is the only branch. The pre-rebuild app is tagged `pre-rebuild-main`. All current work is on
`main`.

## 4. Start Claude from the repo root

```bash
cd ~/code/rivet
claude
```

This is the step people get wrong. `CLAUDE.md` is loaded from the working directory and its
parents — so starting Claude from `~/code` instead of `~/code/rivet` means the project context
never loads, and you get an agent guessing about a codebase where half the files are dead.

**Always start Claude from inside the repository.**

## 5. Confirm the context loaded

In the Claude session:

```
/context
```

You should see `CLAUDE.md` listed among the loaded files. Then check the skills are visible:

```
/rivet-dev
```

If that runs, the project skills are registered. If it isn't found, you're in the wrong
directory — see step 4.

Sanity-check the shared understanding by asking something only the repo context can answer:

> Which parts of this codebase are dead?

A correctly-configured session answers from `docs/CODEBASE_MAP.md` — the `(dashboard)` tree,
most of `src/app/api`, `src/hooks`, three of the four Python backends. If it starts grepping
around and guessing, the context isn't loading.

## 6. Approve the plugins

`.claude/settings.json` declares the team's plugin set. On first run Claude will prompt to
enable them; accept. To check afterwards:

```
/plugin
```

| Plugin | Why it's in the set |
| --- | --- |
| `superpowers` | TDD, systematic debugging, planning, and verification workflows |
| `frontend-design` | Visual design guidance for UI work |
| `code-review` | `/code-review` on a branch or PR |
| `pr-review-toolkit` | Specialised review agents — silent failures, type design, test coverage |
| `github` | PR and issue operations |
| `playwright` | Browser automation, for the E2E tests in the plan |
| `claude-md-management` | Keeps `CLAUDE.md` accurate as the codebase changes |
| `skill-creator` | For adding new project skills |

Don't add plugins to `.claude/settings.json` unilaterally — it changes everyone's environment.
Personal additions belong in your own user-level config.

## 7. Set up your local permissions (optional)

`.claude/settings.local.json` is yours and gitignored. Use it to stop being prompted for
commands you run constantly:

```json
{
  "permissions": {
    "allow": [
      "Bash(npm run:*)",
      "Bash(npx tsc --noEmit)",
      "Bash(supabase status)",
      "Bash(supabase db reset)",
      "Bash(git diff:*)",
      "Bash(git log:*)"
    ]
  }
}
```

The `/fewer-permission-prompts` command will scan your transcripts and propose a list based on
what you actually run.

---

## The six project skills

These are the workflows worth having an agent follow exactly rather than improvise. Invoke by
name, or just describe the task and Claude will pick the right one.

| Skill | Use it when |
| --- | --- |
| `rivet-dev` | Booting the local stack, or it won't start |
| `rivet-data` | Writing any query or mutation — **read this before touching data access** |
| `rivet-migration` | Changing the schema |
| `rivet-ui` | Building or changing a page |
| `rivet-ai` | Prompts, models, the FastAPI service |
| `rivet-ship` | Before opening a PR |

`rivet-data` is the one that earns its place most. The `pg` pool bypasses Row Level Security,
so tenant scoping is enforced by hand in every query. An agent that hasn't read that skill will
write a plausible-looking query that leaks another contractor's data.

## Keeping everyone in sync

The repo files are the source of truth, so staying aligned is mostly a matter of updating them
rather than telling each other things.

- **Correct the file, not just the session.** If Claude gets something wrong about the project
  and you correct it in chat, that correction dies with the session. Put it in `CLAUDE.md` or
  the relevant skill so it holds for everyone.
- **`/revise-claude-md`** proposes updates to `CLAUDE.md` from what a session learned. Review
  the diff before committing — it's a suggestion, not an authority.
- **New repeatable workflow?** Add a skill under `.claude/skills/`, commit it, and it's on
  everyone's machine at their next pull.
- **Behaviour change means a doc change in the same PR.** A stale doc is worse than no doc,
  because someone will believe it — and now that someone is an agent acting on it.
- **Decisions get an ADR** in `docs/adr/`. Context, decision, consequences, date.

## Conventions the agent already knows

These are in `CLAUDE.md`, so you shouldn't need to restate them — but so you know what to
expect:

- Every query is tenant-scoped by hand. RLS is not protecting you.
- Google Gemini only in product code. Temperature ≤ 0.2, JSON mime type when output is parsed.
- No string interpolation into SQL, ever.
- Server actions validate with Zod and return `{ ok, data } | { ok, error }` — never throw.
- Terse output. No summary paragraphs, no new markdown files unless asked.

That last one is deliberate: this repo already carries about 140 markdown files, most of them
misleading. Adding more is the problem, not the fix.

## Troubleshooting

**Skills don't appear.** You're not in the repo root. `cd ~/code/rivet` and restart.

**Claude edits dead code.** Point it at `docs/CODEBASE_MAP.md`. If it happened because
`CLAUDE.md` was ambiguous, tighten `CLAUDE.md` and commit — that's a real fix, and it fixes it
for everyone.

**Everything is slow.** The repo is probably still in iCloud Drive. See step 3.

**`/context` shows no CLAUDE.md.** Confirm `CLAUDE.md` exists at the repo root and that you
started Claude from there, not from a parent or subdirectory.
