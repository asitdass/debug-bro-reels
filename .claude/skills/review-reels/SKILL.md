---
name: review-reels
description: Read the last Debug Bro reel's Instagram insights, work out what went wrong and right, and record the fixes the next reel must apply. Use before making any new reel or next DSA question, and when asked how a reel did.
---

# Review the last reel before making the next one

Two ways to get the numbers: the Instagram API (`pipeline/fetch-insights.mjs`, runs on GitHub) or a browser signed in
as debug_bro (the built-in browser on Asit's Mac, the only source of per-reel follows and profile visits).
Read only: never change, post, boost or delete anything on Instagram.

1. `node pipeline/review-gate.mjs` names the reel that needs a review. Also open instagram.com/debug_bro/reels/ and
   check for reels posted by hand that are missing from `data/published.json` (add them, with a note).
2. For that reel and the one before it: open the reel, click "View insights", and record views, viewers,
   non-follower %, likes, comments, saves, shares, follows, profile activity, length, whether a song was attached, and
   `readAt` (now, ISO) in `data/insights.json`. Skip rate and the retention curve exist only in the phone app: ask Asit
   for screenshots and record them if he sends them. Never estimate a number you did not see.
3. Compare with earlier reels in rates, not totals: (saves + shares) / views, follows / viewers, comments / viewers.
   Note the reel's age; numbers younger than 24 h are early. One reel is weak evidence: call a cause a hypothesis.
4. Watch the posted reel's first frame and opening. What would make a stranger scroll past?
5. Check the previous fix: did the metric it targeted move? Write the result in the experiment log in
   `data/learnings.md`. Drop fixes that failed twice; keep what worked.
6. Append to `data/reviews.json`: {slug, readAt, numbers, worked[], failed[], fixes[{id, change, metric}]}. 1-4 fixes,
   each something the next episode can actually do. If a delivered reel was never posted: {slug, "notPosted": true}.
7. `node pipeline/review-gate.mjs` must print OK. Commit the data files only when Asit asks to push.
8. Tell Asit: the numbers, what to fix, and which fix the next reel applies. Do not promise more views.

## On GitHub (API)
No browser: skip steps 1-2 and 4. `data/insights.json` is already fresh. The reel to review is the one
`node pipeline/review-gate.mjs` names.
- `skipRate`: % who skipped almost at once. High means the first frame or first line fails.
- `avgWatchSec` against `lengthSec` (or the episode's timings.json): where the middle loses people.
- Compare at similar age using each reel's `history`; say when a reel is younger than 24 h.
- To judge the opening, read the first scene of that episode's episode.json.
- Set the review's `readAt` to that reel's `readAt`. Put the numbers you used in `numbers`.
- Then steps 3, 5 and 6.

The next episode sets `learnedFrom` {slug, fix, how}: apply that ONE fix visibly (the experiment), and keep the other
things that worked.
