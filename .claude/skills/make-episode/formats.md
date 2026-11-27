# Debug Bro formats

Every episode picks ONE format. Never the same format as the previous episode, and never the same opening scene type
twice in a row (the validator enforces both). The LOOK no longer rotates: every episode uses the house style `stage`
(src/stage.tsx), whose wall colour already changes with each scene's mood. Formats change the script shape only.

The characters are the brand and DO repeat: **Debug Bro** (Asit: curly hair, beard, dotted shirt) and **the Intern**
(glasses, teal hoodie, asks the questions a beginner would). Everything else changes every time.

Scene types for every format: see the table in SKILL.md. Lengths: 10-15 scenes, 120-175 words, 40-60 s, a `tease`
every 12-15 s, and every format ends: cheat sheet (`board` checks) → `quiz` → CTA with the comment keyword.

---

## 1. desi-story (like devmonk's "RAC 7, raat 2 baje", 6.6M)
An everyday Indian moment, then the hidden system behind it, told as the moment unfolds.
- Topics: railways, UPI, food delivery, cricket streaming, Aadhaar OTP, metro card, toll FASTag, GPS, exam results site.
- Beats: `moment` (place + time, the felt line, a stamp like "RAC 7") → 1 scene of the tension ("RAC KYUN?") →
  3-5 scenes of the system as the story moves on (`flow`, `hotrow`, `batch`, `counter`, `board`) → the payoff moment
  ("2 baje TTE ne berth de di") → CTA.
- Hook rule: the first frame is a situation people have lived, never a number.

## 2. whiteboard (like billu_developer's "Push ≠ LIVE", 526k)
The Intern believes something wrong; Debug Bro busts it on a whiteboard and gives the real steps.
- Topics: practical dev skills people get wrong: deploy, localhost vs live, git, env variables, which framework,
  why your API is slow, JWT vs session, Docker in one minute, first job tasks.
- Beats: `board` with `"title": "Belief = Reality?"` and `"not": true` (the = turns into a red ≠) → `dialog` intern says
  the belief → `dialog` bro, short correction → `board` layout flow or steps (the real path) → `board` layout checks
  (a checklist to save) → CTA.
- Make it actionable: someone should be able to do it after watching.

## 3. ai-hack (like sys.design.101's "ChatGPT ke 5 codes", 2M)
A numbered list of AI tricks people can use today.
- Topics: ChatGPT / Claude / Gemini prompts for devs and students, AI tools for resumes, interview prep, code review,
  free tools, hidden settings. Only tricks you verified from official docs or posts.
- Beats: hook (`hook` or `dialog`: "Bhaiya, AI se resume bana diya, koi call nahi aaya") → `tip` 1/N … N/N (3-5 tips,
  one scene each, with an `example`) → the best one again as the payoff → CTA ("Comment PROMPTS, poori list DM").

## 4. news (like varun mayya, posted the same day)
A big tech story from the last 48 hours, explained in Hinglish with the "why it matters to you" angle.
- Only if a real, sourced story from the last 2 days exists. Say the status exactly (announced / rumoured / live).
- Beats: `headline` (source, date, the headline) → `dialog` intern: "Iska mere liye kya matlab?" → 3-4 scenes:
  what happened, the tech behind it, what changes for Indian devs/users → bro's one-line take → CTA.

## 5. skit (like jayantcreates / mr_stick, 172k-1.3M)
A short funny dialogue with a twist ending. Mostly `dialog` scenes, ping-pong lines, the last line flips it.
- Topics: dev life (the bug that works on my machine, prod on Friday, the intern pushed to main), AI doing too much.
- Beats: 5-8 `dialog` lines alternating intern / bro, with `react` poses (facepalm, laugh, shock), one `board` or `code`
  cut-in as proof, a twist line, CTA. Each line ≤ 12 words. Must make a developer laugh or say "so true".

## 6. myth-fact
Three quick myths about something everyone uses, each busted in 2 scenes.
- Topics: "incognito hides you", "more RAM = faster phone", "UPI is free for everyone", "deleting WhatsApp chats
  deletes them", "charging overnight kills battery".
- Beats: `hook` ("3 cheezein jo tum galat maante ho") → for each myth: `board` title "Myth = Sach?" with `not` →
  one scene of the real reason (`flow`, `compare`, `counter`) → CTA.

---

## Hooks (pick a different type from the previous episode)
1. **Lived moment**: "Train, raat 2 baje. RAC 7." (desi-story)
2. **Wrong belief**: "Push kiya = website live?" (whiteboard, myth-fact)
3. **Dialogue cliffhanger**: Intern: "Bhaiya, maine prod database delete kar diya." (skit, whiteboard)
4. **Promise + list**: "5 ChatGPT tricks jo 99% log nahi jaante" (ai-hack) — only if all 5 are real
5. **Breaking news**: the headline itself (news)
6. **Absurd question**: "Toilet se GPS kaise kaam karta hai?" (desi-story)

The first frame must make sense with the sound off. Never open on a statistic.

## CTA: the comment-keyword freebie (every episode)
Set `leadMagnet` {keyword, promise}, e.g. {"keyword": "DEPLOY", "promise": "Deploy checklist PDF"}. The last scene says
it in `vo` and `cap`: "Comment DEPLOY, checklist DM mein bhejta hoon." The caption asks too, below the hook ("👇 Comment DEPLOY for ..."; shape in SKILL.md).
Before it, a `quiz` scene: a question people answer in one letter, answer not in the reel (like billu's "API ya MCP?"). Add a
"send this to the friend who …" line in the caption. Asit sends the DMs (the pipeline makes the PDF).
Optional series hook: `"part": 1` and "Part 2 chahiye? Comment PART2".

## Banned (they made eps 1-3 feel identical)
- The "15 LPA" interview chat and the दोहा `rule` ending as fixtures. Each may appear at most once in 5 episodes.
- Opening on a number, a definition or "aaj hum seekhenge" (the validator rejects a number).
- An empty or dark first frame. Frame 0 must already show the headline, the monitor visual and both characters.
- Explaining in order: problem → solution → summary. Tell it as a story or a list instead.
