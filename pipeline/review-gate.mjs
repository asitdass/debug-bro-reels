// "Study the last reel before making the next one." A new episode is accepted only when the latest posted reel has fresh
// numbers in data/insights.json and a review in data/reviews.json, and the episode names the fix it applies.
// usage: node pipeline/review-gate.mjs        (exit 1 = review the last reel first)
//
// pipeline/fetch-insights.mjs reads the numbers from the Instagram API (GitHub: review.yml). /review-reels on the Mac
// does the same in the browser. Without API data, a delivered reel that was not posted gets {"slug", "notPosted": true}.
import fs from 'node:fs';
import path from 'node:path';
import {ROOT, readJSON} from './util.mjs';

const DAY = 24 * 60 * 60 * 1000;

export function reviewGate(excludeSlug) {
  const published = readJSON(path.join(ROOT, 'data/published.json'), []);
  const reviews = readJSON(path.join(ROOT, 'data/reviews.json'), {reviews: []}).reviews;
  const data = readJSON(path.join(ROOT, 'data/insights.json'), {reels: []});
  const insights = data.reels;
  const skipped = new Set(reviews.filter((r) => r.notPosted).map((r) => r.slug));
  const isEpisode = (slug) => fs.existsSync(path.join(ROOT, 'episodes', slug, 'episode.json'));
  // with API data we know what is really on Instagram; without it, fall back to what was delivered
  const posted = data.apiSyncedAt
    ? insights.filter((r) => r.readAt && r.postedAt && isEpisode(r.slug))
    : published.filter((p) => ['reel', 'trial-reel'].includes(p.kind) && !skipped.has(p.slug));
  const latest = posted.filter((p) => p.slug !== excludeSlug).sort((a, b) => new Date(b.postedAt) - new Date(a.postedAt))[0];
  const errors = [];
  const warnings = [];
  if (!latest) return {errors, warnings};
  const review = reviews.filter((r) => r.slug === latest.slug).at(-1);
  const numbers = insights.filter((r) => r.slug === latest.slug).sort((a, b) => new Date(b.readAt ?? 0) - new Date(a.readAt ?? 0))[0];
  const ask = `run the "Review the last reel" workflow, or /review-reels on the Mac, for ${latest.slug}`;
  if (!numbers || typeof numbers.views !== 'number' || !numbers.readAt) errors.push(`no insights for the last reel (${latest.slug}): ${ask}`);
  if (!review?.readAt || !review.fixes?.length) errors.push(`no review of the last reel (${latest.slug}): ${ask}`);
  else if (new Date(review.readAt) < new Date(latest.postedAt)) errors.push(`the review of ${latest.slug} is older than its latest posting: ${ask}`);
  else if (new Date(review.readAt) - new Date(latest.postedAt) < DAY)
    warnings.push(`${latest.slug} was reviewed less than 24 h after posting: the numbers are early`);
  return {errors, warnings, latest, review};
}

/** the rules for one new episode: gate passed, and learnedFrom points at a fix from that review */
export function checkLearning(ep) {
  let {errors, warnings, latest, review} = reviewGate(ep.slug);
  // GitHub's scheduled runs have no browser: rather than stop, learn from the newest saved review and say so
  if (errors.length && process.env.UNATTENDED) {
    review = readJSON(path.join(ROOT, 'data/reviews.json'), {reviews: []})
      .reviews.filter((r) => r.fixes?.length)
      .sort((a, b) => new Date(a.readAt) - new Date(b.readAt))
      .at(-1);
    if (review) {
      latest = {slug: review.slug};
      warnings = [`no fresh review of the last reel; using the saved review of ${review.slug}`];
      errors = [];
    }
  }
  if (errors.length || !latest) return {errors, warnings};
  const ids = review.fixes.map((f) => f.id);
  if (!ep.learnedFrom) errors.push(`set "learnedFrom" {slug: "${latest.slug}", fix: one of ${ids.join(', ')}, how}: read data/reviews.json`);
  else if (ep.learnedFrom.slug !== latest.slug) errors.push(`learnedFrom.slug must be the last posted reel, ${latest.slug}`);
  else if (!ids.includes(ep.learnedFrom.fix)) errors.push(`learnedFrom.fix "${ep.learnedFrom.fix}" is not in that review (${ids.join(', ')})`);
  return {errors, warnings};
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const r = reviewGate();
  r.warnings.forEach((w) => console.log(`warn  ${w}`));
  r.errors.forEach((e) => console.log(`ERROR ${e}`));
  if (!r.errors.length) console.log(`OK: last reel ${r.latest?.slug ?? '(none)'} is reviewed. Fixes to choose from: ${(r.review?.fixes ?? []).map((f) => f.id).join(', ')}`);
  process.exit(r.errors.length ? 1 : 0);
}
