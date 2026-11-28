# Handoff: where Debug Bro stands (26 Nov 2026, evening)

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
- **House style `stage`** (`src/stage.tsx`, from ep 5): bright room, both characters always on screen behind a desk,
  every scene plays on a big monitor, `cap` is the headline, the wall colour follows each scene's mood. The first scene
  is pre-rolled (`HOOK_PREROLL` in `src/Reel.tsx`) so frame 0 is the finished hook. New scene fields: `tease`
  (open-loop sticker), `react` (listener pose), `speaker: "alt"` (the Intern says a non-dialog line); new scene `quiz`.
  The old styles (`cinema`, `phone`, `comic`, `poster`…) still render but are experiments only.
- **Learning loop**: `data/insights.json` (per-reel numbers read from instagram.com/insights/media/<id>) and
  `data/learnings.md` (rules + experiment log). Every new episode sets `experiment`, `style` and 3 `hooks`;
  `pipeline/validate.mjs` enforces it, plus no repeated format/opening/"15 LPA"/दोहा.
- **Research**: `data/swipe.md` (outlier reels of billu_developer, devmonk.preetam, sys.design.101, jayantcreates.ai,
  mr_stick001, neuronvisuals, thevarunmayya).

## 26 Nov study (data/swipe.md): what the hits do that we didn't
Full frame from frame 0, a lived moment or wrong belief then "kaise?" within 5 s, characters big and acting, ONE
consistent look, open loops every ~15 s (length 53-164 s is fine), a comment-keyword ask in the caption (since 28 Nov: hook first, ask below), quiz endings,
original audio. Our ep03 (UPI, 135 views) and devmonk's UPI reel (8.3M) were the SAME topic.

## Results so far
Eps 1-3: 119-135 views, ~0 saves/shares. Ep 4 (Microsoft 365 outage, cinema style) posted 25 Nov: re-check after 48 h.
The only breakout on the account: June "DSA sheet, Day 0" reel, 5,240 views, 188 saves, 134 shares.

## Review loop (28 Nov 2026)
Before every new reel: `/review-reels` on the Mac reads Instagram insights into `data/insights.json` and writes
`data/reviews.json`; `pipeline/review-gate.mjs` blocks new episodes (local and GitHub) until the last posted reel is
reviewed, and each new episode sets `learnedFrom`. DSA questions must vary hook type, analogy, opening and jokes.

## Twice-daily DSA run (on GitHub since 28 Nov)
`.github/workflows/dsa-schedule.yml` starts around 04:47 and 17:47 IST (with backups): write the next question, test the
code, then call Daily reel, which sends video, caption and PDF to Telegram. It uses the last saved review
(`UNATTENDED`). The Mac's Claude scheduled task only refreshes reviews (`.claude/skills/daily-dsa/`).
The Instagram Graph API works again (28 Nov, after Asit's confirmation). `review.yml` runs
`pipeline/fetch-insights.mjs` and has Claude write the review before each new script. Posting stays manual
(`POST_MODE=manual`); API posting is untested since the block. The Mac task is an optional extra for follows.

## DSA format since 28 Nov: "dsa2" (src/dsa2.tsx)
Hook, series line, question, promise, slow way, guess, payoff, key code, one ask (~60-75 s); the cover shows the number
out of 150, name, difficulty, concept, a tiny puzzle and a "Prep for" MANGOS row (public/logos, from simple-icons
16.38.1; OpenAI is text because the set has no logo; the logos are their owners' trademarks). Rules: dsa.md.

## Next steps
1. Ep 5 (`ep05-ek-tick-matlab-block`, WhatsApp ticks, stage style) is written and validated, not posted. Run the
   workflow (it renders the lowest unpublished episode first); post it with the Telegram checklist (cover, original
   audio, pinned comment, quiz answer after ~2 h).
2. 48 h after ep 4 and ep 5: read insights into `data/insights.json`, ask Asit for skip rate + retention screenshots,
   fill the experiment log in `data/learnings.md`.
3. Later: comment-to-DM bot and auto-posting once Meta lifts the hold; Modal (needs a card) for AI-drawn art.

## Run locally (Mac)
`npm ci && pip install -r requirements.txt` (+ ffmpeg). Secrets go in `.env` (never commit): SARVAM_API_KEY,
TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID (IG_* only if auto-posting). `node pipeline/validate.mjs <slug>`,
`node pipeline/review-stills.mjs <slug>` (key frames to out/<slug>/), `npm run reel -- --slug=<slug> --no-publish`.
