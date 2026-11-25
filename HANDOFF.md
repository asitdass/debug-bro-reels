# Handoff: where Debug Bro stands (26 Nov 2026)

Read this first if you are a new Claude Code session picking up this project. CLAUDE.md has the rules.

## What exists
- **Pipeline**: Claude writes `episodes/<slug>/episode.json` (skill: `.claude/skills/make-episode/`), Sarvam TTS voices it
  (Debug Bro = `sunny_hi_reels`, the Intern = `ritu_hi_reels`), Remotion renders it (`src/`), and in
  `POST_MODE=manual` (default) the reel + cover + ready-to-paste caption + the comment-keyword PDF go to Telegram.
  Asit posts by hand (the Meta Graph API is blocked by a developer-account hold).
- **Workflow**: `.github/workflows/daily-reel.yml`, run on demand only (schedules are commented out on purpose; the
  Claude scheduled task "Debug Bro daily reel" is paused). Start a run:
  `gh api -X POST repos/asitdass/debug-bro-reels/actions/workflows/daily-reel.yml/dispatches -f ref=main -F 'inputs[publish]=true'`
  (add `-f 'inputs[slug]=<slug>'` to render an existing episode; `publish=false` = preview only, not logged).
- **Characters**: vector puppets in `src/components/Mascot.tsx`: Debug Bro (Asit: curly hair, beard, dotted shirt
  over striped tee) and the Intern (young woman dev, glasses, ponytail, teal hoodie). 10 poses, lip sync to the voice.
- **Formats** (script shapes): desi-story, whiteboard, ai-hack, news, skit, myth-fact (`formats.md` in the skill).
- **Styles** (`src/styles.ts`): kit styles that re-lay the whole reel (`phone` chat thread, `comic` panel pages,
  `poster` kinetic type, in `src/kits.tsx`) and skin styles on the standard layout (`cinema`, `notebook`,
  `blueprint`, `newsroom`, `terminal`). Alternate kit and skin; never repeat a style within 2 episodes.
- **Learning loop**: `data/insights.json` (per-reel numbers read from instagram.com/insights/media/<id>) and
  `data/learnings.md` (rules + experiment log). Every new episode sets `experiment`, `style` and 3 `hooks`;
  `pipeline/validate.mjs` enforces it, plus no repeated format/opening/"15 LPA"/दोहा.
- **Research**: `data/swipe.md` (outlier reels of billu_developer, devmonk.preetam, sys.design.101, jayantcreates.ai,
  mr_stick001, neuronvisuals, thevarunmayya).

## Results so far
Eps 1-3: 119-135 views, ~0 saves/shares. Ep 4 (Microsoft 365 outage, cinema style) posted 25 Nov: re-check after 48 h.
The only breakout on the account: June "DSA sheet, Day 0" reel, 5,240 views, 188 saves, 134 shares.

## Next steps
1. Read ep 4's insights (views, saves, shares, follows) into `data/insights.json`; ask Asit for app screenshots of
   skip rate + retention for eps 3-4; update `data/learnings.md`.
2. Make ep 5 with a kit style (phone, comic or poster) and one experiment from learnings.md, end on a keepable checklist.
3. Later: comment-to-DM bot and auto-posting once Meta lifts the hold; Modal (needs a card) for AI-drawn art.

## Run locally (Mac)
`npm ci && pip install -r requirements.txt` (+ ffmpeg). Secrets go in `.env` (never commit): SARVAM_API_KEY,
TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID (IG_* only if auto-posting). `node pipeline/validate.mjs <slug>`,
`node pipeline/review-stills.mjs <slug>` (key frames to out/<slug>/), `npm run reel -- --slug=<slug> --no-publish`.
