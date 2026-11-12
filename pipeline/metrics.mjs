// Pulls Insights for everything posted in the last 21 days and ranks by sends per reach.
// Writes data/metrics.json, which the make-episode skill reads to pick the next topic.
import path from 'node:path';
import {insights} from './instagram.mjs';
import {ROOT, readJSON, writeJSON} from './util.mjs';

const posted = readJSON(path.join(ROOT, 'data/published.json'), []);
const cutoff = Date.now() - 21 * 86400_000;
const rows = [];
for (const p of posted.filter((p) => new Date(p.postedAt).getTime() > cutoff && p.mediaId)) {
  const m = await insights(p.mediaId);
  const reach = m.reach || 0;
  rows.push({
    slug: p.slug,
    pillar: p.pillar,
    kind: p.kind,
    postedAt: p.postedAt,
    ...m,
    sendsPerReach: reach ? +(m.shares / reach).toFixed(4) : null,
    savesPerReach: reach ? +(m.saved / reach).toFixed(4) : null,
  });
}
rows.sort((a, b) => (b.sendsPerReach ?? 0) - (a.sendsPerReach ?? 0));

const byPillar = {};
for (const r of rows) {
  const p = (byPillar[r.pillar] ??= {posts: 0, reach: 0, shares: 0, saved: 0});
  p.posts++;
  p.reach += r.reach || 0;
  p.shares += r.shares || 0;
  p.saved += r.saved || 0;
}
for (const p of Object.values(byPillar)) p.sendsPerReach = p.reach ? +(p.shares / p.reach).toFixed(4) : null;

writeJSON(path.join(ROOT, 'data/metrics.json'), {updatedAt: new Date().toISOString(), byPillar, posts: rows});
console.table(rows.map(({slug, reach, views, shares, saved, sendsPerReach}) => ({slug, reach, views, shares, saved, sendsPerReach})));
console.table(byPillar);
