# Debug Bro brand contract

Every episode follows this. Claude reads it when writing a script and again when reviewing rendered frames.

## Promise
Apps andar se kaise kaam karte hain, Hinglish mein. One real Indian app moment → the system design behind it → a
line you'll remember. For developers and curious app users, 18–30, India.

## Story, not lecture
- Open on a **moment**, not a fact: a time, a place, a feeling ("10:00:01. Tatkal. Site gayi."). A number is fine
  only if it is shocking and shown big.
- Every episode uses one of the 6 formats in `.claude/skills/make-episode/formats.md` (desi-story, whiteboard,
  ai-hack, news, skit, myth-fact), never the same as the previous episode. The beats come from the format.
- The characters repeat (Debug Bro + the Intern); formats, hooks, looks and endings do not. No recurring gags:
  the "15 LPA" chat and the दोहा ending are rare guests, at most once in 5 / 3 reels.
- A metaphor `world` is optional and helps desi-story reels.
- The last line should flow back into the first, so a rewatch feels seamless.

## Pace
- A new picture every 2–3 s: 7–12 scenes, 70–110 words of voice-over total, 25–40 s.
- One idea per scene. Max 14 words of voice-over per scene (dialog and coldopen may use 18).
- Never hold a static frame: something moves, counts, types, pops or glows in every scene.

## Words on screen
- Captions are **Roman Hinglish** in the `cap` field: 2–5 words per line, top half of the screen.
- Exactly one accent word per caption sentence, wrapped in `*asterisks*`. It renders in italic serif and amber.
- No emoji in on-screen text. No paragraphs. Numbers as digits ("6.5 crore", "37,410").
- Voice-over (`vo`) stays Devanagari Hindi + English tech words, so the voice pronounces it right.

## Look
- Each format has its own theme (src/theme.ts THEMES): desi-story dark cinematic with amber, whiteboard warm yellow
  with a hand-drawn board (Kalam), ai-hack light lavender, news black + red, skit sky blue, myth-fact deep teal.
  Light and dark formats should alternate in the grid.
- Type: Inter (bold) for captions, Instrument Serif italic for accent words and headlines, JetBrains Mono for
  labels and code.
- Every scene carries a small part label, e.g. `// 03 — break`, and the part counter.

## Voice
- Sarvam reel voices: Sunny on odd episodes, Ritu on even; the other voice is the Intern in dialogue scenes.
- Energetic, friendly, a little cheeky. Like explaining to a friend over chai, never like a lecture.

## Call to action
- End with a comment keyword and a freebie (`leadMagnet`): "Comment DEPLOY, checklist DM mein bhejta hoon." The
  pipeline sends Asit the PDF on Telegram; he DMs it to commenters (until the auto-DM bot is switched on).
- Plus a send prompt in the caption ("us dost ko bhejo jo…"). Optional series hook: "Part 2 chahiye? Comment PART2".
- Caption line 1 is the keyword ask. Before the CTA, a `quiz` whose answer is pinned later, never said in the reel.
- Post with the reel's original audio (no trending song under the voice-over), the hook frame as cover, and pin the ask
  as the first comment. Telegram sends this checklist with every reel.

## Facts
- Every real number, date, incident or policy needs a source opened that day; state its current status exactly
  (announced / postponed / live).
- Illustrative numbers on screen are fine if the voice-over doesn't claim them as facts.
- No logos, show thumbnails, real people's faces (other than Debug Bro), stock tips or legal/medical advice.

## Frame review checklist (Claude checks every rendered key frame)
1. Can you read every word at phone size? Nothing cut off at the edges or hidden under Instagram's UI
   (top 250 px, bottom 420 px, right 120 px)?
2. Does the frame show ONE clear idea, with the accent word visible?
3. Is anything overlapping (caption over a card, text over text)?
4. Would this frame make someone stop scrolling? If it's just a box with text, add motion or a bigger visual.
5. Does the first frame alone make you want to know what happens next? (review-01: headline, monitor visual and both
   characters fully visible, never blank or fading in.)
6. Stage style: does anything important sit behind the characters' heads (bottom of the monitor) or under a tease
   sticker? Is every tease paid off later in the reel?

### DSA-101 frames (style `dsa`; replaces items 5 and 6)
- Every word, number and code line on screen belongs to THIS problem and matches the voice-over and notes.json. Any
  leftover from another problem fails the review.
- Code: no line touches or crosses the panel edge. The highlighted line matches its meaning.
- Dry run: the store rows, current index and result are what the code would really do.
- First frame: the problem name is readable, not buried under a word stamp.

## Mascot
Debug Bro is a flat vector puppet of Asit (src/components/Mascot.tsx): curly hair, full beard, open dotted charcoal
shirt over a blue-white striped tee, tan-strap watch. The Intern is a young woman dev (glasses, ponytail, teal hoodie).
In the house style `stage` (src/stage.tsx, from ep 5) both stand behind a desk with a rubber duck under a big monitor,
in every scene: the one talking lip-syncs and takes the scene's `pose`, the other takes its `react` pose. Older styles
put Debug Bro alone bottom-left with the scene scaled to 84%.
