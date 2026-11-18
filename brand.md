# Debug Bro brand contract

Every episode follows this. Claude reads it when writing a script and again when reviewing rendered frames.

## Promise
Apps andar se kaise kaam karte hain, Hinglish mein. One real Indian app moment → the system design behind it → a
line you'll remember. For developers and curious app users, 18–30, India.

## Story, not lecture
- Open on a **moment**, not a fact: a time, a place, a feeling ("10:00:01. Tatkal. Site gayi."). A number is fine
  only if it is shocking and shown big.
- One **metaphor world** per episode, used everywhere: UPI = a toll booth, CDN = chai stalls in every gali,
  rate limiter = a bouncer at a club. Name it in `world` and make scene art, labels and jokes fit it.
- Beats: HOOK (0–2 s) → SETUP (the naive "15 LPA" answer) → BREAK (it fails, visibly) → REVEAL (the real pattern,
  named) → TWIST (one surprising detail or number) → PAYOFF (दोहा) → CTA → loop back to the hook image.
- The last line should flow back into the first, so a rewatch feels seamless.

## Pace
- A new picture every 1–2 s: 9–14 scenes, 70–100 words of voice-over total, 30–40 s.
- One idea per scene. Max 12 words of voice-over per scene (the coldopen and rule may use 18).
- Never hold a static frame: something moves, counts, types, pops or glows in every scene.

## Words on screen
- Captions are **Roman Hinglish** in the `cap` field: 2–5 words per line, top half of the screen.
- Exactly one accent word per caption sentence, wrapped in `*asterisks*`. It renders in italic serif and amber.
- No emoji in on-screen text. No paragraphs. Numbers as digits ("6.5 crore", "37,410").
- Voice-over (`vo`) stays Devanagari Hindi + English tech words, so the voice pronounces it right.

## Look
- Dark, warm, cinematic: deep charcoal background, film grain, soft glows. Accent colours: amber (#ffb547) for
  emphasis, red for failure, green for the fix, blue for neutral info.
- Type: Inter (bold) for captions, Instrument Serif italic for accent words and headlines, JetBrains Mono for
  labels and code.
- Every scene carries a small part label, e.g. `// 03 — break`, and the part counter.

## Voice
- Sarvam reel voices: Sunny on odd episodes, Ritu on even, the other voice reads the "15 LPA" line.
- Energetic, friendly, a little cheeky. Like explaining to a friend over chai, never like a lecture.

## Call to action
- End with a question the viewer can answer in one word in the comments ("Comment karo: Redis ya Kafka?") plus a
  send prompt ("ye us dost ko bhejo jo…").
- Never promise a DM or a freebie until the comment-to-DM automation is switched on (`CTA_DM=on`).

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
5. Does the first frame alone make you want to know what happens next?
