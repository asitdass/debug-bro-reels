---
name: make-episode
description: Write the next Debug Bro reel. Picks a topic from data/topics.md, trending news and past metrics, researches the facts, writes episodes/<slug>/episode.json and validates it. Use when asked to make, write or plan the next reel or episode.
allowed-tools: Read, Write, Edit, Glob, Grep, WebSearch, WebFetch, Bash(node pipeline/validate.mjs:*), Bash(ls:*)
---

# Make the next Debug Bro episode

Debug Bro (@debug_bro) makes 35–55 s Hinglish reels that explain the system design behind apps every Indian uses.
Your job is the creative part only: pick the topic, get the facts right, write `episode.json`. The Node pipeline
does voice, animation, rendering and posting. Do not touch `src/` or `pipeline/`.

## 0. Read first
`data/swipe.md` (what the outlier reels of the creators Asit admires do, beat by beat), then
`.claude/skills/make-episode/formats.md` (the 6 formats, hook types, CTA rules, what is banned), then `brand.md`.

## 1. Pick the format, then the topic
1. Read `data/published.json` and the previous 2 episodes' `format` and first scene type. Pick a DIFFERENT format
   from the previous episode (and not one used twice in the last 4). Rotate looks: alternate dark and light formats.
2. Search the last 48 hours of India tech news (one or two `WebSearch` calls). A big, sourced story → `news` format
   (if the previous episode wasn't news). A viral app/outage → `desi-story`.
3. Otherwise pick a topic that fits the chosen format (examples in formats.md) from `data/topics.md` or your own
   research, and tick it. Prefer topics a non-engineer has lived (trains, UPI, phones) or a beginner dev needs today
   (deploy, git, AI tools): the outliers in swipe.md are those, not textbook system design.
4. Ask: would someone send this to a friend? If not, pick another topic.

Pillars: `everyday-tech`, `money-tech` (never investment advice), `interview`, `ai-tools`, `dev-skills`, `news`.

## 2. Research
- Every real-world number, date or incident you say out loud needs a source you opened with `WebFetch`. Put the URLs
  in `sources`. If you can't verify a number, don't say it; use words like "लाखों" instead.
- Animated counters may use illustrative numbers, but the voice-over must not claim them as facts.
- Policies, fees and launches change: check the **current** status (announced vs postponed vs in effect) with a
  search for news from the last 2 weeks, and say exactly that status in the `vo` and caption.
- Never claim how a specific company implements something unless a source (engineering blog, talk, official post)
  says so. Say "ऐसे systems में" for the general pattern.
- No stock tips, no medical/legal advice, nothing about private individuals, no logos or show thumbnails.

## 3. Write `episodes/epNN-<short-slug>/episode.json`
`NN` = next number (count existing `episodes/ep*` folders + 1). `slug` field = folder name. Copy the shape of
`episodes/ep01-tatkal-crash/episode.json`. The schema is `src/schema.js`.

**Structure: follow the chosen format's beats in formats.md.** 7–12 scenes, 70–110 words, 25–40 s, max 14 words
per scene (18 for `dialog`/`coldopen`). A new picture every 2–3 seconds. Set `format`, `leadMagnet` and the hook type.
Every non-dialog scene has `beat` and `cap`: the Roman-Hinglish caption (2–6 words) with exactly ONE accent word in
*asterisks*, e.g. `"cap": "Par rollout abhi *postponed*"`. `dialog` scenes show their `line` in a speech bubble (no
`cap`); set `vo` to the same words. The Intern's lines are read by the second voice automatically.
Do not copy the shape of any earlier episode: eps 1–3 are what NOT to repeat. The validator rejects a reel that
repeats the previous format, the previous opening scene type, the "15 LPA" chat or the दोहा ending.
After writing, the workflow renders frames and Claude reviews them, so make the first frame stop a scroll on its own.

**Characters**: Debug Bro (a cartoon of Asit) stands bottom-left in every reel, lip-syncing the voice; in `dialog`
scenes he and the Intern both appear and the corner mascot steps aside. His pose comes from
the scene's `beat`; set `"pose"` on a scene to override it (idle, point, explain, think, shock, facepalm, thumbsup,
shrug, crossed, laugh) when a reaction fits the line better, e.g. `laugh` on a joke.

**Voice-over (`vo`)**: Hinglish the way Indian devs talk. Hindi words in Devanagari, tech words in English
(`database`, `Redis`, `queue`). Short sentences, max ~25 words per scene. Write numbers in words when spoken
("सैंतीस हज़ार"). The captions show `vo` word by word, so spell it exactly as it should appear.

**On-screen text**: short, Roman-script Hinglish or English, no emoji (fonts can't render them). Respect each
field's max length in the schema.

**Moods** colour the background: `neutral` for hook/chat, `problem` (red) while it breaks, `solution` (green) for
the fix, `comeback` (amber) for compare/twist. **Tags** (`PROBLEM`, `SOLUTION`, `INTERVIEW`…) label scenes.

**Scene types** (fields in `src/schema.js`):
| type | shows | key fields |
| --- | --- | --- |
| coldopen | ticking number/clock → glitch, error card, big question (first scene) | tick, setup, error, question |
| hook | big kinetic headline | kicker, title, sub |
| chat | interview chat bubbles (rare: max once in 3 reels) | messages[side,name,text,badge] |
| code | typed SQL/code, stamp, multiplier | code, highlight, verdict, stamp, multiplier, multiplierLabel |
| flood | users flying into a DB | target, total, sub |
| hotrow | one hot row, queue of users, connection meter filling | rows, hot, valueLabel, from, to, meterLabel, meterMax, alert |
| counter | one big number counting | label, from, to, sub, tone |
| solution | glowing pattern name | kicker, title, sub, chipLabel, chipValue |
| batch | fast in-memory tier flushing to DB | fastLabel, fastSub, fastTo, slowLabel, slowSub, slowFrom, slowTo, every |
| flow | 2–4 step request path with a moving packet | nodes[label,sub], packet |
| compare | wrong vs right, ticks and crosses | left{title,items}, right{title,items} |
| crash | a counter that cracks and resets | label, value, quote |
| rule | दोहा + send prompt + next teaser (rare: max once in 5 reels) | rule, cta, next |
| board | whiteboard drawn live; "A = B" title with `not` flips to a red ≠ | title, not, layout (flow/steps/checks), items[label,sub,icon≤5 chars] |
| dialog | Intern (left) and Debug Bro (right), one line in a speech bubble | who (intern/bro), line, react (listener's pose), pose |
| headline | news card: source, date, big headline | source, date, headline, sub, label |
| tip | one numbered trick: big "2/5", the trick, what it does, example | n, of, title, desc, example |
| moment | a lived moment: place + time, one big line, a stamp | place, line, stamp |

**Caption**: line 1 = the hook retold with search words ("RAC ticket pe raat 2 baje berth kaise milti hai?"),
line 2 = "Comment KEYWORD, <promise> DM mein bhejta hoon", line 3 = "Us dost ko bhejo jo …", then 2–3 lines of the
key takeaway, then "Save karo, kaam aayega." Exactly 3 hashtags, specific (one niche tag + two topic tags). `coverText` = 3–5 punchy words.
`keywords` = 5–7 lowercase phrases people actually type into Instagram search, shown as `[keyword]` in the caption:
2–3 about the topic in Hinglish/English ("upi kaise kaam karta hai", "upi free kyun hai"), 1–2 for the exact
concept ("mdr charges"), and 2 for the niche ("system design in hindi", "coding in hindi"). No hashtags, no emoji.

Voice: set `"voice": {"engine": "sarvam"}`. Sarvam's reel voices alternate by episode number (odd = Sunny,
even = Ritu); a scene with `"speaker": "alt"` is read by the other one. The Intern in `dialog` scenes gets the alt voice automatically. Write numbers in words in `vo`, Hindi in Devanagari, tech words in English.

## 4. Check and finish
1. Run `node pipeline/validate.mjs <slug>`; fix every ERROR and reconsider every warn. Repeat until OK.
2. Re-read the `vo` lines aloud in your head: would a Bhubaneswar engineer say it this way to a friend? Fix stiff lines.
3. Reply with: slug, topic, pillar, and the sources used.
