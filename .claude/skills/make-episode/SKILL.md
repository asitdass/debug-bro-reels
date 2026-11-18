---
name: make-episode
description: Write the next Debug Bro reel. Picks a topic from data/topics.md, trending news and past metrics, researches the facts, writes episodes/<slug>/episode.json and validates it. Use when asked to make, write or plan the next reel or episode.
allowed-tools: Read, Write, Edit, Glob, Grep, WebSearch, WebFetch, Bash(node pipeline/validate.mjs:*), Bash(ls:*)
---

# Make the next Debug Bro episode

Debug Bro (@debug_bro) makes 35–55 s Hinglish reels that explain the system design behind apps every Indian uses.
Your job is the creative part only: pick the topic, get the facts right, write `episode.json`. The Node pipeline
does voice, animation, rendering and posting. Do not touch `src/` or `pipeline/`.

## 1. Pick the topic
1. Read `data/published.json` (never repeat a topic) and `data/metrics.json` if it exists.
   Prefer the pillar with the highest `sendsPerReach`; give each other pillar at least one reel a week.
2. Search today's India tech news (one or two `WebSearch` calls): an outage, sale-day crash, IPL/cricket stream,
   UPI downtime, exam result site crash, viral app launch. A documented event from the last 72 hours beats the backlog.
3. Otherwise take the first unchecked topic in `data/topics.md` for the chosen pillar, and tick it.

Pillars: `everyday-tech` (how an app you use works), `money-tech` (how UPI, cards, apps make money, explained, never
investment advice), `interview` (a classic system-design question, roasted), `ai-tools` (how an AI feature works).

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

**Read `brand.md` first: it is the style contract and overrides anything below.**

**The formula (30–40 s: 9–14 scenes, 70–105 words of voice-over, max 12 words per scene; coldopen and rule up to 18).**
Episodes 1–2 lost viewers in the first seconds because they read like a lecture. Every episode is now a short
story inside ONE metaphor world (`world` field), with a new picture every 1–2 seconds:
1. `coldopen` (beat `hook`) — the moment it breaks, in the first second: `tick` (2–3 values counting to the
   moment), `setup`, `error`, `question` (4–6 words, ends in "?").
2. `chat` (beat `setup`) — the "15 LPA" candidate's confident wrong answer, `"speaker": "alt"`.
3. Break, 1–3 scenes (beat `break`): show it failing — `flow`, `crash`, `hotrow`, `flood`, `code` (`verdict: "wrong"`).
4. Reveal, 2–3 scenes (beat `reveal`): `solution` (name the pattern), `flow`, `batch`.
5. Twist, 1–2 scenes (beat `twist`): one surprising, sourced detail — `counter`, `code`, `compare`.
6. `rule` (beat `cta`): the दोहा, then a one-word comment question ("Comment karo: Redis ya Kafka?"), `next` teaser.
Every scene has `beat` and `cap`: the Roman-Hinglish caption (2–6 words) with exactly ONE accent word in
*asterisks*, e.g. `"cap": "Par rollout abhi *postponed*"`. The caption is what people read; the `vo` is what the
voice says. They should say the same thing, but `cap` is shorter.
Copy the shape of `episodes/ep03-upi-free-paisa-kaun-kamata/episode.json` (the current format), not ep01/ep02.
After writing, the workflow renders frames and Claude reviews them against brand.md, so make the first frame
strong enough to stop a scroll on its own.

**Mascot**: Debug Bro (a cartoon of Asit) stands bottom-left in every reel, lip-syncing the voice. His pose comes from
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
| chat | interview chat bubbles | messages[side,name,text,badge] |
| code | typed SQL/code, stamp, multiplier | code, highlight, verdict, stamp, multiplier, multiplierLabel |
| flood | users flying into a DB | target, total, sub |
| hotrow | one hot row, queue of users, connection meter filling | rows, hot, valueLabel, from, to, meterLabel, meterMax, alert |
| counter | one big number counting | label, from, to, sub, tone |
| solution | glowing pattern name | kicker, title, sub, chipLabel, chipValue |
| batch | fast in-memory tier flushing to DB | fastLabel, fastSub, fastTo, slowLabel, slowSub, slowFrom, slowTo, every |
| flow | 2–4 step request path with a moving packet | nodes[label,sub], packet |
| compare | wrong vs right, ticks and crosses | left{title,items}, right{title,items} |
| crash | a counter that cracks and resets | label, value, quote |
| rule | दोहा + send prompt + next teaser | rule, cta, next |

**Caption**: line 1 = the topic in search words ("Tatkal booking crash kyun hoti hai? System design in Hindi"),
line 2 = the send prompt, then 2–3 lines of the key takeaway, then "Save karo interview ke liye." Exactly 3 hashtags,
specific (`#systemdesign #codinginhindi` + one topic tag). `coverText` = 3–5 punchy words.
`keywords` = 5–7 lowercase phrases people actually type into Instagram search, shown as `[keyword]` in the caption:
2–3 about the topic in Hinglish/English ("upi kaise kaam karta hai", "upi free kyun hai"), 1–2 for the exact
concept ("mdr charges"), and 2 for the niche ("system design in hindi", "coding in hindi"). No hashtags, no emoji.

Voice: set `"voice": {"engine": "sarvam"}`. Sarvam's reel voices alternate by episode number (odd = Sunny,
even = Ritu); a scene with `"speaker": "alt"` is read by the other one. Use alt for the interviewer/"15 LPA" chat
line only (1 scene per reel). Write numbers in words in `vo`, Hindi in Devanagari, tech words in English.

## 4. Check and finish
1. Run `node pipeline/validate.mjs <slug>`; fix every ERROR and reconsider every warn. Repeat until OK.
2. Re-read the `vo` lines aloud in your head: would a Bhubaneswar engineer say it this way to a friend? Fix stiff lines.
3. Reply with: slug, topic, pillar, and the sources used.
