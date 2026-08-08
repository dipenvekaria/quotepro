<!--
Keep it short. The diff says what changed; this says why, and what you checked.
Full gate: .claude/skills/rivet-ship/SKILL.md
-->

## What and why

<!-- One or two sentences. Link an issue or an ADR if there is one. -->

## Verified

<!-- What you actually ran and saw. Not what you intend to run. -->

- [ ] `npm run typecheck` passes
- [ ] Exercised the affected flow in the browser
- [ ] Checked at 375px (techs use this on a phone)
- [ ] Tested as a second role (`office@` / `tech@`) if permissions are involved

## Tenancy

<!-- Delete this section only if the PR touches no data access at all. -->

The `pg` pool bypasses RLS, so tenant scoping is manual and nothing catches a miss.

- [ ] Every new query carries `company_id`, directly or through a join
- [ ] Every mutation verifies ownership of the target row before writing
- [ ] Confirmed a second company cannot see the first company's rows

## Notes

<!-- Trade-offs, follow-ups, anything you deliberately left out. -->
