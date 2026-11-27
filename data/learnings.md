# Learnings: read this before writing every episode

Updated from `data/insights.json` after each reel. Every new episode runs ONE experiment against the last reel
(`experiment` in episode.json) so we learn something from each post.

## What the numbers say (26 Nov 2026)
- Eps 1-3 all stopped at 119-135 views, ~96-98% non-followers, 0 shares, 0-1 saves, 0 follows. That is Instagram's
  first test batch (~110 accounts): the test audience didn't engage, so it stopped pushing. Episode 1's average watch
  time was 6.2 s of 68 s: people left in the first seconds.
- The one breakout on this account (June, "Day 0 of mastering DSA" + a DSA sheet): 5,240 views, **188 saves and 134
  shares** (3.6% and 2.6% of views). It was personal (Asit's own journey) and gave people something to keep.
- So the metric to chase is **saves + shares per view**, then skip rate. Likes don't matter.

## Rules from this (rewritten 26 Nov 2026 after the hit-vs-flop study in data/swipe.md)
1. **Frame 0 is the hook, fully built.** It is the autoplay frame and the grid thumbnail. The code pre-rolls scene 1
   (HOOK_PREROLL in src/Reel.tsx) so it is never a fade from black. Never open on a number or a definition.
2. **Moment or belief, then the question within ~5 s.** "1 tick = block?", "Manali, ₹180 ki Maggi". The question
   ("kaise?", "kyun?", "?") is on screen in the first 3 scenes.
3. **One house look: `stage`** (src/stage.tsx: bright room, both characters always on screen, the scene on a monitor,
   the wall colour changes with every scene's mood). Big accounts never change their look; change the hook, the topic
   and the format instead. Another style only as a deliberate, logged experiment.
4. **Open loops keep people watching.** A `tease` sticker ("Group wala twist end mein", "Quiz aa raha hai") every
   12-15 s; the validator requires 1 above 110 words and 2 above 150. Pay every tease off.
5. **Length follows the story**: 120-175 words (≈40-60 s with Sarvam at ~2.9 words/s). Not shorter by force.
6. **Make it keepable**: a `board` with layout "checks" (cheat sheet) near the end. It now goes into the PDF freebie.
7. **Make it commentable**: caption opens with the hook, then "👇 Comment KEYWORD for <promise>" (Asit chose this on
   28 Nov over asking in line 1), pin the same text
   as a comment, and end on a `quiz` whose answer is NOT in the reel (it goes in a pinned reply ~2 h later).
8. **Make it sendable**: topics everyone uses (WhatsApp, UPI, Uber, trains, ChatGPT) + "us dost ko bhejo jo …".
9. **First-person and dialogue beat lecture.** The Intern voices the viewer's belief; Debug Bro answers.
10. **Original audio.** Don't add a trending song under the voice-over when posting (ep04 had one).

## Experiment log
| ep | style | format | experiment (one change) | result |
| --- | --- | --- | --- | --- |
| 1-3 | cinema | legacy | baseline | 119-135 views, ~0 saves/shares |
| 4 | cinema | desi-story | news topic + dialogue + comment keyword | 69 views ~35 min after posting (26 Nov); grid thumbnail was a blank frame; posted with a trending song. Re-check after 48 h |
| 5 | stage | whiteboard | new house style (full frame, both characters, hook at frame 0) + tease stickers + quiz ending + keyword ask in caption line 1 | 1421 views at 31 h, skip rate 33.5% (best so far; eps 1-4 were 37-69%), avg watch 13.4 s of 45 s, saves+shares 0.35% of views, 0 comments, 0 follows. Style/hook worked for reach; not for saving or following |
| 6 (dsa101-01) | dsa | whiteboard | first DSA-101 reel: solo Debug Bro, one question, no length cap (111 s) | 313 views at 10 h (early, API read 27 Nov 23:53, unchanged from the 23:46 read), skip rate 62%, avg watch 20 s of 111 s, saves+shares 0.64%, 0 comments, 2 follows from 257 viewers. Longer watch time but a worse skip rate than ep05; hypothesis: dark opening with word stamps over the title (one reel, not proven). Fix check: ep05's "reason to follow" was missing (0 follows from 1297); the numbered series gave 2 follows, so keep naming the next question. Re-read after 24 h before judging views. Next: clean-first-frame, early-comment-ask, original audio |

## Still unknown (need screenshots from the Instagram app: Insights → the reel)
- Skip rate (share of viewers who left in the first 3 s) and the retention curve for eps 3-4.
