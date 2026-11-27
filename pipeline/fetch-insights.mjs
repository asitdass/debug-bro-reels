// Reads every recent reel's insights from the Instagram Graph API (read only) into data/insights.json.
// usage: node pipeline/fetch-insights.mjs          needs IG_ACCESS_TOKEN, IG_USER_ID, IG_GRAPH_HOST
//
// A posted reel is matched to its episode by the link already on file, the media id from auto-posting, or the episode's
// comment keyword in the caption ("Comment TWOSUM"). A delivered reel that matches nothing has simply not been posted.
// The API has no per-reel follows or profile visits: values read in the browser are kept as they are.
import fs from 'node:fs';
import path from 'node:path';
import {ROOT, log, readJSON} from './util.mjs';

export const shortcode = (url) => String(url ?? '').match(/\/(?:reel|p)\/([\w-]+)/)?.[1] ?? null;

/** which episode a posted reel is, or null */
export function matchSlug(media, {reels, published, episodes}) {
  const code = shortcode(media.permalink);
  const onFile = reels.find((r) => shortcode(r.url) === code) ?? published.find((p) => p.mediaId === media.id || (p.permalink && shortcode(p.permalink) === code));
  if (onFile) return onFile.slug;
  const hits = episodes.filter((e) => e.keyword && new RegExp(`comment\\W+["“]?${e.keyword}\\b`, 'i').test(media.caption ?? ''));
  return hits.length === 1 ? hits[0].slug : null;
}

/** merges one reel's fresh numbers into the stored list */
export function mergeReel(reels, slug, media, m, now) {
  const code = shortcode(media.permalink);
  let row = reels.find((r) => shortcode(r.url) === code) ?? reels.find((r) => r.slug === slug && !r.url);
  if (!row) reels.push((row = {slug}));
  const postedAt = new Date(media.timestamp).toISOString();
  const ageHours = Math.round((new Date(now) - new Date(postedAt)) / 3600_000);
  const fresh = {
    slug,
    url: media.permalink,
    postedAt,
    views: m.views,
    reach: m.reach,
    likes: m.likes,
    comments: m.comments,
    saves: m.saved,
    shares: m.shares,
    avgWatchSec: m.ig_reels_avg_watch_time == null ? null : +(m.ig_reels_avg_watch_time / 1000).toFixed(1),
    skipRate: m.reels_skip_rate,
    readAt: now,
    ageHours,
  };
  // never replace a number we already have with "not available"
  for (const [k, v] of Object.entries(fresh)) if (v !== null && v !== undefined) row[k] = v;
  if (row.views) row.savesSharesPerView = +(((row.saves ?? 0) + (row.shares ?? 0)) / row.views).toFixed(4);
  // snapshots, so reels can be compared at the same age
  row.history = [...(row.history ?? []), {ageHours, views: row.views, saves: row.saves, shares: row.shares, skipRate: row.skipRate}].slice(-12);
  return row;
}

export const METRICS = ['views', 'reach', 'likes', 'comments', 'saved', 'shares', 'ig_reels_avg_watch_time', 'reels_skip_rate'];

async function main() {
  const token = (process.env.IG_ACCESS_TOKEN ?? '').trim();
  const user = (process.env.IG_USER_ID ?? '').trim();
  if (!token || !user) throw new Error('IG_ACCESS_TOKEN and IG_USER_ID are needed');
  const host = process.env.IG_GRAPH_HOST || 'graph.instagram.com';
  const ver = process.env.IG_API_VERSION || 'v27.0';
  const get = async (p, params) => {
    const res = await fetch(`https://${host}/${ver}/${p}?${new URLSearchParams({...params, access_token: token})}`);
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.error) throw new Error(`Instagram ${res.status}: ${json.error?.message ?? 'request failed'}`);
    return json;
  };

  const file = path.join(ROOT, 'data/insights.json');
  const data = readJSON(file, null);
  if (!data) throw new Error('cannot read data/insights.json');
  const published = readJSON(path.join(ROOT, 'data/published.json'), []);
  const episodes = fs.readdirSync(path.join(ROOT, 'episodes'))
    .map((d) => readJSON(path.join(ROOT, 'episodes', d, 'episode.json'), null))
    .filter(Boolean)
    .map((e) => ({slug: e.slug, keyword: e.leadMagnet?.keyword}));

  const list = (await get(`${user}/media`, {fields: 'id,permalink,timestamp,caption,media_product_type', limit: '15'})).data ?? [];
  const now = new Date().toISOString();
  let read = 0;
  for (const media of list.filter((x) => x.media_product_type === 'REELS')) {
    const slug = matchSlug(media, {reels: data.reels, published, episodes});
    if (!slug) continue;
    const m = {};
    for (const metric of METRICS) {
      // one at a time, so an unsupported metric does not fail the others
      try {
        const r = await get(`${media.id}/insights`, {metric});
        m[metric] = r.data?.[0]?.values?.[0]?.value ?? r.data?.[0]?.total_value?.value ?? null;
      } catch {
        m[metric] = null;
      }
    }
    if (m.views == null) {
      log(`no insights for ${slug}`);
      continue;
    }
    const row = mergeReel(data.reels, slug, media, m, now);
    read++;
    log(`${slug}: ${row.views} views, skip ${row.skipRate ?? '?'}%, avg watch ${row.avgWatchSec ?? '?'} s, age ${row.ageHours} h`);
  }
  if (!read) throw new Error('the API answered but no posted reel matched an episode');
  data.apiSyncedAt = now;
  data.updatedAt = now.slice(0, 10);
  data.note = 'Per-reel Instagram insights. pipeline/fetch-insights.mjs fills them from the Graph API (views, reach, likes, comments, saves, shares, average watch time, skip rate). Follows and profile visits per reel come only from the browser.';
  fs.writeFileSync(file, `{\n  "note": ${JSON.stringify(data.note)},\n  "updatedAt": ${JSON.stringify(data.updatedAt)},\n  "apiSyncedAt": ${JSON.stringify(now)},\n  "reels": [\n${data.reels.map((r) => `    ${JSON.stringify(r)}`).join(',\n')}\n  ]\n}\n`);

  // warn before the token runs out (long-lived tokens expire after about 60 days)
  try {
    const info = (await get('debug_token', {input_token: token})).data;
    log(info?.expires_at ? `token expires ${new Date(info.expires_at * 1000).toISOString().slice(0, 10)}` : 'token has no expiry date');
  } catch {
    log('token expiry could not be read');
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
