# Debug Bro reels

Hands-off pipeline for **@debug_bro**: every evening it writes, voices, animates and posts a 35–55 s Hinglish
system-design reel, then posts a carousel cheat-sheet twice a week and tracks what's working.

```
 GitHub Actions (cron, free)
 ├─ 1. Claude Code (/make-episode, your Pro plan)  picks topic → researches → episodes/<slug>/episode.json
 ├─ 2. pipeline/tts.py                             Hindi voice + word timings   (edge-tts, free)
 ├─ 3. Remotion                                    animated 1080×1920 MP4 + cover + carousel slides
 ├─ 4. Telegram bot                                video on your phone: [Post it] [Skip]   (optional)
 ├─ 5. Cloudflare R2 → Instagram Graph API         posts the Reel                         (free)
 └─ 6. pipeline/metrics.mjs                        sends-per-reach per pillar → feeds step 1
```

Cost: ₹0 beyond Claude Pro. Remotion is free for individuals; edge-tts, R2 (10 GB), Telegram, the Instagram API
and GitHub Actions (public repo, or ~1,000 min/month private) are free.

## 1. Run it on your laptop first (10 minutes)

Needs Node 22+, Python 3.10+ and ffmpeg.

```bash
npm ci
pip install -r requirements.txt
npm run studio                                   # live preview of the sample episode in the browser
npm run reel -- --slug=ep01-tatkal-crash --no-publish
# → out/ep01-tatkal-crash/reel.mp4, cover.jpg, slide-*.jpg
```

Make a new episode with Claude Code in this folder:

```bash
claude "/make-episode"
npm run reel -- --no-publish
```

## 2. One-time setup for auto-posting

**Instagram** (Instagram API with Instagram Login)
1. Switch @debug_bro to a **Creator** account.
2. developers.facebook.com → Create app → add the **Instagram** product → "API setup with Instagram login".
3. Add @debug_bro as a tester, grant `instagram_business_basic` + `instagram_business_content_publish`.
4. Generate a token there; copy the **Instagram user ID** and the **long-lived token** (valid 60 days).
   Refresh it every ~50 days with `npm run refresh-token` and update the secret.

**Cloudflare R2** (Instagram fetches the video from a public URL)
1. Create a bucket, enable its public `r2.dev` URL → `PUBLIC_MEDIA_BASE`.
2. Create an R2 API token (Object Read & Write) → `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, endpoint.

**Telegram approval** (optional, recommended)
1. Message @BotFather → `/newbot` → token. Send your bot "hi".
2. Open `https://api.telegram.org/bot<TOKEN>/getUpdates` and copy `chat.id`.
3. Every evening the reel arrives on your phone with **Post it / Skip**. No answer in 30 min → it posts
   (set repo variable `APPROVAL_DEFAULT=skip` to change that).

**Claude in GitHub Actions**: run `claude setup-token` locally (uses your Pro subscription) → secret
`CLAUDE_CODE_OAUTH_TOKEN`. Install the Claude GitHub App on the repo (or run `/install-github-app`).

**GitHub**: push this folder to a repo, then add these repository secrets:
`CLAUDE_CODE_OAUTH_TOKEN, IG_USER_ID, IG_ACCESS_TOKEN, S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY_ID,
S3_SECRET_ACCESS_KEY, PUBLIC_MEDIA_BASE, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID` (+ `SARVAM_API_KEY` if used).
Test with Actions → Daily reel → Run workflow (untick "Publish" for a dry run; the MP4 is in the run's artifacts).

## Schedules (IST)
| When | Workflow | What |
| --- | --- | --- |
| Daily 18:15 | `daily-reel.yml` | write → voice → render → Telegram → post ~19:00 |
| Daily 07:30 | `carousel-and-metrics.yml` | pull Insights → `data/metrics.json` |
| Wed + Sat 12:00 | `carousel-and-metrics.yml` | carousel cheat-sheet of the latest reel |

## Changing things
- **Voice**: `EDGE_VOICE=hi-IN-SwaraNeural` (female) or `TTS_ENGINE=sarvam` (better Hinglish, free trial credits).
  The voice is AI-generated, so turn on Instagram's AI label if the app asks; your own voice later builds more trust.
- **Topics**: edit `data/topics.md`. Trending news gets priority automatically.
- **Look**: `src/theme.ts` (colours/fonts), `src/scenes/scenes.tsx` (the 12 scene types). `npm run studio` to preview.
- **Background music**: drop a royalty-free MP3 in `public/music/` and set `"music": "music/<file>.mp3"` in an episode.
- **Trial Reels** (after 200 followers): `npm run reel -- --trial`.

## Files
| Path | What |
| --- | --- |
| `.claude/skills/make-episode/SKILL.md` | how Claude picks, researches and writes an episode |
| `src/schema.js` | episode format (validated before every render) |
| `episodes/<slug>/episode.json` | one reel: scenes, voice-over, caption, sources |
| `pipeline/run.mjs` | the orchestrator (`npm run reel`) |
| `pipeline/tts.py` | voice + word timings |
| `pipeline/render.mjs` | MP4, cover, carousel slides |
| `pipeline/instagram.mjs` | R2 upload, Graph API publish, Insights |
| `pipeline/telegram.mjs` | approval on your phone |
| `data/published.json`, `data/metrics.json` | what was posted and how it did |
