# DSA-101 episodes (simple format, "style": "dsa2")

One question per reel, taught completely, like a game with levels: after watching, a student needs no other video.
Hook, series line, what the data structure is, what the question asks (every operation, with an example), the catch, a
guess, the brute force (code and why it is slow), the tempting shortcut that breaks, the key idea and why it works, the
code, a step-by-step dry run, the comparison, the sentence to say in the interview, and one closing ask. English voice,
about 2 to 2.7 minutes. Teach like the best teacher: everyday words, an example before every rule, one idea per
screen, one short joke per level that is about the thing being taught. These rules replace the system-design steps in
SKILL.md. Episodes 1 and 2 (`"style": "dsa"`) are the retired format.

You write two files; the code in `src/dsa2.tsx` draws only what they say:

- `episodes/dsa101-NN-<problem-name>/episode.json`: the reel and its cover
- `episodes/dsa101-NN-<problem-name>/notes.json`: the PDF people get for commenting the keyword

## 1. Pick the problem and number it
- The last DSA episode promised the next one (the first `practice` problem in its notes.json; for episode 2, its `close` scene `next`). Make that one. `dsa.n` = last `dsa.n` + 1, `number` = highest
  `number` of ANY episode + 1, `NN` = `dsa.n`.
- `dsa.leetcode`, `name`, `difficulty`, `category` come exactly from `data/dsa150.json` (the validator checks them).
  Its `n` field is not the episode number. Write "LeetCode #X" in the caption; never from memory.
- The picture is a stack or a row of cells with one helper structure. If a problem cannot be shown honestly that way
  (trees, graphs, linked lists), take the next one in `data/dsa150.json` that can, and say so.
- `dsa.companies`: `[]` unless you opened a page showing it (then `companySource`, also in `sources`).

## 1b. Learn from the last reel
`node pipeline/review-gate.mjs` must print OK (else stop: run `/review-reels`). Apply one fix from the latest review in
`data/reviews.json` and record `learnedFrom` {slug, fix, how}. A fix never changes the order of the parts below.

## 2. Solve it first
Write the solution and its tests in `notes.json` before the script. Trace every example by hand: every number on screen
(values, helper values, verdicts) must follow from the code.

## 3. The hook (most important)
`dsa.hook` rotates; never the same as the last episode:
- `company`: a company name plus a job-seeker's worry. "Amazon interview. Mind blank?"
- `job-life`: a real moment of job hunting, no company. "Placements next month. Still stuck?" "No calls yet?"
- `wrong-answer`: a confident answer that is wrong. "Smallest is 3. Remove 3. Still 3?"

Rules: headline at most 7 easy words; voice line at most 12 words; the puzzle is on screen beside it; write a new one
each time. Company names are for preparation only: never say a company asks this question, and never say anyone got
selected, without a source. No made-up statistics, messages or offers.

## 4. episode.json
Top level: `slug`, `number`, `series: "DSA-101"`, `title`, `topic`, `pillar: "interview"`, `format: "whiteboard"`,
`style: "dsa2"`, `dsa` {n, leetcode, name, difficulty, category, companies: [], hook}, `cover` {art: 2-5 short tiles
showing the puzzle, note (at most 12 characters, like "min = ?"), pose}, `experiment`, 3 `hooks`, `learnedFrom`,
`leadMagnet` {keyword, promise}, `voice` (copy from the last DSA episode), `caption`, `hashtags`, `keywords`,
`coverText`, `sources`, `scenes`.

Every scene: `{"type": "dsa2", "kind", "vo", "data", "level", "meter", "pop"?, "fx"?}`. At most 40 words per `vo`, 480 in
total. `level` is the chip at the top ("3/7 Brute force"), on every scene after the series line. `meter` is the
interviewer's mood 0-100: neutral 50, low when something fails, 100 at the end. `pop` {icon: like/comment/share/follow/
save, text} is a nudge, at most 3 in the reel besides the closing screen. `fx` overrides the transition.
`lines` are headlines: 1-3 very short lines (at most 18 characters), at most one `*highlighted*` word. `title` at most 16
characters, `note` at most 34. `board` = {layout: "stack" (up to 4, newest last) or "row" (up to 6), values, side?:
{title, values}, slots?, lit?: [cell indices]}.

| kind, in this order (* repeats) | teaches | `data` |
| --- | --- | --- |
| hook | the worry | lines (up to 4), board, ask (at most 16) |
| series | "Welcome to question N of 150 popular LeetCode questions." | total: 150 |
| concept* | the data structure, from zero | title, note, board, drop?, crash?, result? |
| ops* | what the question asks: one scene per operation or input rule, with the example | same as concept |
| catch | the constraint that makes it hard; promise something at the end | lines, tag (at most 20) |
| guess | let them think | lines, sticker (at most 30) |
| brute* (2+) | the obvious solution: its code, its run, why it is too slow | title, note, code (2-5 lines from notes.brute.code), line, board, scan?, bad? |
| trap* (optional) | a clever-looking shortcut and the exact input that breaks it | title, note, board, box {label, value}, bad? |
| insight* | the key idea and WHY it works | title, note, board, grow? |
| code | the optimal code, line by line | lines, code (3-9 lines), focus |
| dryrun* (3-8) | the real code on the example, one step per scene | title, note, board after the step, show [first, last] code-scene lines (at most 5), line |
| compare | brute force against optimal, and the price paid | lines (1), slow {title, value}, fast {title, value}, note (at most 26) |
| say | the interview sentence | lines, quote (at most 110) |
| ask | "Like ... comment KEYWORD ... share ... follow for more questions." | lines |

NEVER name the next question: not in the voice, on screen or in the caption.

`code` lines are copied from the Python in notes.json, in order, with the same nesting; leave lines out, never rewrite
them. Use 2 spaces per level and short names so lines fit.

Dry run: run the real code on the reel's own example, one operation or one loop step per scene, and include the step
that shows why the trick works (for Min Stack: popping the smallest). Every value shown must be what the code holds.

Pay every promise. Every value on screen must be what the code really holds at that moment.

### Caption
English. The `[keyword, list]` and hashtags are added from `keywords` and `hashtags`.
```
<the hook as a sentence, one emoji, at most 125 characters>

Welcome to DSA-101: two interview classics every day.
Question N: <name> (LeetCode #X)
<one sentence: the trick and what it buys>

👇 Comment KEYWORD for the full notes PDF in Python, Java, C++ and JavaScript.

Save it, share it with your placement friend and follow for more questions.
```
`keywords` (7): problem name, "leetcode X", the technique, "dsa 101", "coding interview", 2 concepts.
`hashtags` (5): #dsa #leetcode #codinginterview #programming #computerscience.

## 5. notes.json (the PDF)
A short lesson that stands on its own, in your own words (never paste LeetCode's problem text). Plain characters only:
no arrows, emoji or Devanagari. Fields (schema: `notesSchema` in `src/dsaSchema.js`):

- `title`, `problem`, `examples`[2-4: input, output, why]
- `analogy`, `brute` {explain, time, space, code: Python, same interface, must pass the Python test}, `insight`[2-5 paragraphs: why the better idea works]
- `steps`[3-8], `dryRun` {input, headers, rows} on a DIFFERENT input from the reel's
- `code`: `python`, `java`, `cpp`, `javascript`, each {code (80 characters a line at most, commented), note, test}
- `complexity` {time, timeWhy, space, spaceWhy}, `mistakes`[2-6], `interview`[2-6]
- `practice`[2-4: name, leetcode, why; only problems listed in data/dsa150.json]; the first is the next episode
  (internally: never announce it)

`test` is appended after the code and must exit non-zero on a wrong answer. Cover the examples and edge cases. Java:
the solution is `class Solution` (imports first) and the test declares `public class Main` with `main`. Python: use
`assert`. JavaScript: `throw`. C++: `main` that calls `exit(1)`.

## 6. Check
1. `node pipeline/validate.mjs <slug>` until OK.
2. When you can run commands: `node pipeline/check-code.mjs <slug>`, `python3 pipeline/notes_pdf.py <slug>` and
   `node pipeline/review-stills.mjs <slug>`. "NOT CHECKED" means untested. GitHub tests the code before sending.
3. Reply with the slug, the problem and the sources.
