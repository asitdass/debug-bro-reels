---
name: make-episode
description: Write the next Debug Bro reel. Picks a topic from data/topics.md, trending news and past metrics, researches the facts, writes episodes/<slug>/episode.json and validates it. Use when asked to make, write or plan the next reel or episode.
allowed-tools: Read, Write, Edit, Glob, Grep, WebSearch, WebFetch, Bash(node pipeline/validate.mjs:*), Bash(ls:*)
---

# Make the next Debug Bro episode

**DSA-101 episode** (an interview question; "DSA", "LeetCode", `style: "dsa"`)? Follow [dsa.md](dsa.md) instead of
this file.

Debug Bro (@debug_bro) makes 40–60 s Hinglish reels that explain the system design behind apps every Indian uses.
Your job is the creative part only: pick the topic, get the facts right, write `episode.json`. The Node pipeline
does voice, animation, rendering and posting. Do not touch `src/` or `pipeline/`.

## 0. Read first
`data/learnings.md` and `data/insights.json` (how the last reels actually did, and the rules that came out of it),
then `data/swipe.md` (what the outlier reels of the creators Asit admires do, beat by beat), then
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

5. Pick the **experiment**: ONE change versus the previous reel, taken from learnings.md (e.g. "first-person hook
   instead of a scene", "end on a full-screen checklist to save", "25 s instead of 38 s"). Write it in `experiment`
   {change, why, metric}. Keep everything else comparable, so the result teaches something.
6. **Style: always `"style": "stage"`** (the house look, src/stage.tsx): a bright room, the Intern (left) and Debug Bro
   (right) always on screen, every scene plays on a big monitor between them, the headline (`cap`) on top, and the wall
   colour follows each scene's `mood`. The 26 Nov study (data/swipe.md) showed every outlier account keeps ONE look;
   what changes is the hook, the topic and the format. Use another style only as a deliberate experiment written in
   `experiment` (the validator warns).

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

**Structure: follow the chosen format's beats in formats.md.** 10–15 scenes, 120–175 words (≈40–60 s: Sarvam reads
~2.9 words/s), max 14 words per scene (18 for `dialog`/`coldopen`). A new picture every 2–3 seconds.
**Open loops**: put a `tease` (≤40 chars, e.g. "Group wala twist end mein", "Quiz aa raha hai, ruko") on a scene every
12–15 s, from scene 3 on; every tease must be paid off later. The validator needs 1 above 110 words, 2 above 150. Set `format`, `leadMagnet` and the hook type.
Every non-dialog scene has `beat` and `cap`: the Roman-Hinglish caption (2–6 words) with exactly ONE accent word in
*asterisks*, e.g. `"cap": "Par rollout abhi *postponed*"`. `dialog` scenes show their `line` in a speech bubble (no
`cap`); set `vo` to the same words. The Intern's lines are read by the second voice automatically.
**Hooks**: write 3 different hook options in `hooks` (different hook types from formats.md). Score each: does the
first frame alone stop a scroll with the sound off? (Frame 0 shows scene 1 fully built: its `cap` as the headline and
its visual on the monitor, both characters reacting.) Is it a moment, a belief or a line of dialogue (never a number:
the validator rejects that)? Is it under 8 words on screen? Does a question ("kaise?", "kyun?", "?") reach the screen
within the first 3 scenes? Use the best one. Good first scenes: a `board` whose title is the wrong belief
("1 tick = Block?"), a `moment`, a `headline`.
**Ending**: a keepable payoff (a cheat sheet on a `board` with layout "checks", or a `tip`), then a `quiz` (2–4
options, `answer` index, `why`) whose answer is NOT said in the reel (Asit pins it ~2 h later; the Telegram checklist
carries it), then the CTA line with the comment keyword.
Do not copy the shape of any earlier episode: eps 1–3 are what NOT to repeat. The validator rejects a reel that
repeats the previous format, the previous opening scene type, the "15 LPA" chat or the दोहा ending.
After writing, the workflow renders frames and Claude reviews them, so make the first frame stop a scroll on its own.

**Characters** (stage style): both are on screen in every scene. Who talks: a `dialog` scene's `who`; any other scene is
Debug Bro unless it has `"speaker": "alt"`, which makes the Intern say it (her voice, her lip sync), e.g. the hook
belief. `pose` = the talker's pose (idle, point, explain, think, shock, facepalm, thumbsup, shrug, crossed, laugh);
`react` = the listener's pose. Pick reactions that act the line out: the Intern `shock` at the problem, Debug Bro
`think` while she panics, both `thumbsup` at the payoff. A `dialog` line appears as a big chat card on the monitor.

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
| quiz | question + 2–4 lettered options, "Comment karo: A ya B?" (answer NOT shown) | question, options, answer, why |

Any scene may also set `tease` (open-loop sticker), `react` (listener pose) and `speaker: "alt"` (the Intern says it).

**Caption** (hook first; blank line between blocks; write only the text, the pipeline adds keywords and hashtags):
```
<hook: the pain or the surprise, one emoji, at most 125 characters>

<2-4 short lines: what the reel shows and the takeaway; the quiz question if there is one>

👇 Comment KEYWORD for <the freebie, said concretely>.

Save karo + us dost ko bhejo jo <specific friend>.
```
Hinglish for system-design reels. Never open with "Comment" (the validator rejects it). 3–5 specific `hashtags`.
`coverText` = 3–5 punchy words.
`keywords` = 5–7 lowercase phrases people actually type into Instagram search, shown as one `[a, b, c]` list:
2–3 about the topic in Hinglish/English ("upi kaise kaam karta hai", "upi free kyun hai"), 1–2 for the exact
concept ("mdr charges"), and 2 for the niche ("system design in hindi", "coding in hindi"). No hashtags, no emoji.

Voice: set `"voice": {"engine": "sarvam"}`. Sarvam's reel voices alternate by episode number (odd = Sunny,
even = Ritu); a scene with `"speaker": "alt"` is read by the other one. The Intern in `dialog` scenes gets the alt voice automatically. Write numbers in words in `vo`, Hindi in Devanagari, tech words in English.

## 4. Check and finish
1. Run `node pipeline/validate.mjs <slug>`; fix every ERROR and reconsider every warn. Repeat until OK.
2. Re-read the `vo` lines aloud in your head: would a Bhubaneswar engineer say it this way to a friend? Fix stiff lines.
3. Reply with: slug, topic, pillar, and the sources used.

## 5. After a reel is posted (48 hours later, when asked)
Open each new reel's insights (instagram.com/p/<code>/ → View insights, logged in as debug_bro) and add views,
viewers, non-follower %, likes, comments, saves, shares and follows to `data/insights.json`. Ask Asit for app
screenshots of the retention curve and skip rate (the web doesn't show them). Then update `data/learnings.md`: fill
the experiment's result in the log, and change the rules if the numbers say so.
