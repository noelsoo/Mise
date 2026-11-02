@AGENTS.md

## Project rules
- Supabase work follows `.claude/skills/supabase` (security checklist) and `.claude/skills/supabase-postgres-best-practices`.
- Build against OWASP Top 10:2025: RLS on every table, no secrets in `NEXT_PUBLIC_*`, pinned deps, zod on every server input, SSRF guard on URL import, errors fail closed.
- British English, metric default, Singapore time. Never derive a calendar date from `toISOString()`; use `localDateString()` / `toYmd()` in `src/lib/utils.ts`.
- Design tokens live in `src/app/globals.css` (Botanical Culinary Editorial: Newsreader + Inter, sage #3F6F4E, terracotta #C8562B).
