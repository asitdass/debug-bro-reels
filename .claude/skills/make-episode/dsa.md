# DSA-101 episodes

One interview question per reel: Debug Bro alone, English voice, no length cap, `"style": "dsa"`. These rules replace
the system-design steps in SKILL.md (formats.md, the `stage` style and the word cap do not apply).

You write two files. The code in `src/` draws only what they say: nothing about any problem is built in.

- `episodes/dsa101-NN-<problem-name>/episode.json`: the reel
- `episodes/dsa101-NN-<problem-name>/notes.json`: the PDF people get for commenting the keyword

Copy the shape of `episodes/dsa101-01-two-sum/`, never its words, numbers, analogy or jokes.

## 1. Pick the problem and number it
- Find the last DSA episode (highest `dsa.n`). Its `close` scene promised the next problem: make that one.
- `dsa.n` = last `dsa.n` + 1. `number` = highest `number` of ANY episode + 1. `NN` in the slug = `dsa.n`.
- `dsa.leetcode`, name, difficulty and category come from `data/dsa150.json`. The `title` scene's text must be that name
  (the validator checks it). The `n` in dsa150.json is not the episode number.
- `dsa.companies`: leave `[]`. A company tag is a factual claim; add one only if you opened a page that shows it, put
  that URL in both `dsa.companySource` and `sources`, and say "candidates report" in the voice. NeetCode lists and the
  public problem page do not show companies.

**Never write a LeetCode number** anywhere people can read or hear it: voice, on-screen text, caption, keywords,
notes.json. "Question N" (the series number) is enough. `dsa.leetcode` is only an internal lookup (validator enforces).

## 2. Solve it first
Write the solution and its tests in `notes.json` before the script. Trace your examples by hand: every number in the
reel (answers, dry run, step counts, speed-up) must follow from the code. Any time estimate states its assumption
("at a billion checks a second").

## 3. episode.json
Top level: `slug`, `number`, `series: "DSA-101"`, `title`, `topic`, `pillar: "interview"`, `format: "whiteboard"`,
`style: "dsa"`, `dsa`, `experiment`, 3 `hooks`, `leadMagnet` {keyword, promise}, `voice` (copy it from episode 1),
`caption`, `hashtags`, `keywords`, `coverText`, `sources` (the problem page at least), `scenes`.

Every scene: `{"type": "dsa", "kind", "beat", "pose", "vo", "data"}`. `vo` at most 45 words, English, short sentences.
Order that works: title, problem, brute, pause, gate, steps, code, run (1-3 of them), trap, aha, smile, name, notes,
quiz, close. Skip a kind when it does not fit the problem; never bend a problem to fit a kind.

| kind | `data` fields (all required unless marked ?) |
| --- | --- |
| title | title (the problem name), face (smirk/smile/flat), bubble |
| problem | heading, cells[2-8, each ≤4 chars], highlight[cell indices of the answer], targetLabel?, target?, working, answer |
| brute | heading, cells[3-8], mode ("pairs" or "scan"), counterLabel, counterTo (number), result |
| pause | hint |
| gate | heading, sign (≤10), items[2-5], storeTitle (the analogy's data structure) |
| steps | steps[2-4], yes?, no? |
| code | file, lines[3-12, ≤48 chars], meanings (exactly one per line, ≤44) |
| run | cells, i (current index), panelLabel, panelText, panelAccent?, storeTitle, store[rows BEFORE this step, max 4], push? (row added), hit? (row index matched), pop? (remove last row), matched?[cell indices], found (true on the last step), result |
| trap | heading, rows[exactly 2: {title, cells, steps[1-2], result, bad}] wrong first, then right |
| aha | slow {label, value}, fast {label, value, bar 0.01-1}, headline, sub |
| smile | bubble, label |
| name | name (the technique), pairs[2-4 of [from, to]], footer |
| notes | heading, rows[3-5 of [key ≤7, value]] |
| quiz | question, options[2-3, no "A:" letters], answer (index), why |
| close | save, send, like (button texts), next (next problem's name) |

Any `data` may add `slams` (full-screen word stamps: [{at 0-1, text, color?, hold?, tilt?, size?}]) and `cut`
(punch, slideL, slideR, slideUp, flip, zoom, drop, wipe). Use slams sparingly: each one hides the scene while it shows,
and the first frame must not repeat the title underneath it.

The last scene's `vo` must say "save", "send", "like" and the keyword. The quiz answer is never said in the reel; the
Telegram checklist carries it. No emoji in on-screen text.

## 4. notes.json (the PDF)
A short lesson that stands on its own, in your own words (never paste LeetCode's problem text). Plain characters only:
no arrows, emoji or Devanagari. Fields (schema: `notesSchema` in `src/dsaSchema.js`):

- `title`, `problem`, `examples`[2-4: input, output, why]
- `analogy` (the same one as the reel), `brute` {explain, time, space}
- `insight`[2-5 paragraphs]: why the better idea works, not just what it does
- `steps`[3-8], `dryRun` {input, headers, rows} on a DIFFERENT input from the reel's
- `code`: `python`, `java`, `cpp`, `javascript`, each {code (≤80 chars a line, commented), note (what is specific to
  that language), test}
- `complexity` {time, timeWhy, space, spaceWhy}, `mistakes`[2-6], `interview`[2-6], `practice`[2-4: name, why]

`test` is appended after the code and must exit non-zero on a wrong answer. Cover the examples and the edge cases.
Java: the solution is `class Solution` (imports first), the test declares `public class Main` with `main`.
Python: use `assert`. JavaScript: `throw`. C++: `main` that calls `exit(1)`.

If the caption promises code in these four languages, all four must be in the PDF.

## 5. Check
1. `node pipeline/validate.mjs <slug>` until OK.
2. When you can run commands (not in the GitHub writing step): `node pipeline/check-code.mjs <slug>` and
   `python3 pipeline/notes_pdf.py <slug>`. "NOT CHECKED" means untested, not passed. GitHub runs the same code check
   in the "Check DSA code" job.
3. Reply with the slug, the problem and the sources.
