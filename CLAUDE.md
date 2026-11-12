# Debug Bro reels

Automated pipeline for the @debug_bro Instagram page: Hinglish system-design explainer reels.

- Writing an episode: follow `.claude/skills/make-episode/SKILL.md` (`/make-episode`).
- Episodes live in `episodes/<slug>/episode.json`; the schema is `src/schema.js`; validate with `node pipeline/validate.mjs <slug>`.
- `npm run reel -- --slug=<slug>` does voice → render → approval → publish. `--no-publish` stops after rendering.
- Visual style lives in `src/` (Remotion). Only change it when asked; episodes should not need code changes.
- Facts: every real number or incident in a voice-over needs a source in `sources`. Never invent statistics.
- Never commit `.env` or tokens.
