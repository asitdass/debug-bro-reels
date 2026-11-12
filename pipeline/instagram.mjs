// Upload to public storage (Cloudflare R2 / S3) and publish to Instagram via the official Graph API.
import fs from 'node:fs';
import path from 'node:path';
import {S3Client, PutObjectCommand} from '@aws-sdk/client-s3';
import {env, log} from './util.mjs';

/* ---------------- storage: Instagram needs a public URL to fetch media from ---------------- */
let s3;
function client() {
  if (!s3)
    s3 = new S3Client({
      region: env('S3_REGION', 'auto'),
      endpoint: env('S3_ENDPOINT'), // R2: https://<account_id>.r2.cloudflarestorage.com
      credentials: {accessKeyId: env('S3_ACCESS_KEY_ID'), secretAccessKey: env('S3_SECRET_ACCESS_KEY')},
    });
  return s3;
}

export async function uploadPublic(file, key) {
  const type = file.endsWith('.mp4') ? 'video/mp4' : 'image/jpeg';
  await client().send(
    new PutObjectCommand({Bucket: env('S3_BUCKET'), Key: key, Body: fs.readFileSync(file), ContentType: type}),
  );
  const url = `${env('PUBLIC_MEDIA_BASE').replace(/\/$/, '')}/${key}`; // R2: the bucket's public r2.dev URL or your domain
  log(`uploaded ${path.basename(file)} → ${url}`);
  return url;
}

/* ---------------- Graph API ---------------- */
const host = () => env('IG_GRAPH_HOST', 'graph.instagram.com'); // graph.facebook.com if you use Facebook Login
const ver = () => env('IG_API_VERSION', 'v27.0');
const base = () => `https://${host()}/${ver()}`;

async function call(method, p, params = {}) {
  const body = new URLSearchParams({...params, access_token: env('IG_ACCESS_TOKEN')});
  const url = method === 'GET' ? `${base()}/${p}?${body}` : `${base()}/${p}`;
  const res = await fetch(url, method === 'GET' ? {} : {method, body});
  const json = await res.json();
  if (!res.ok || json.error) throw new Error(`Instagram ${p}: ${JSON.stringify(json.error ?? json)}`);
  return json;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitReady(containerId, maxMin = 10) {
  for (let i = 0; i < maxMin * 4; i++) {
    const {status_code, status} = await call('GET', containerId, {fields: 'status_code,status'});
    if (status_code === 'FINISHED') return;
    if (status_code === 'ERROR' || status_code === 'EXPIRED') throw new Error(`container ${containerId}: ${status_code} ${status ?? ''}`);
    await sleep(15000);
  }
  throw new Error(`container ${containerId} not ready after ${maxMin} min`);
}

async function publishContainer(id) {
  const {id: mediaId} = await call('POST', `${env('IG_USER_ID')}/media_publish`, {creation_id: id});
  const {permalink} = await call('GET', mediaId, {fields: 'permalink'}).catch(() => ({}));
  return {mediaId, permalink};
}

/**
 * Trending audio via Instagram's Audio API (GET /ig_audio; no search_query = trending).
 * Only works with the Instagram API with *Facebook Login* (IG_GRAPH_HOST=graph.facebook.com) and returns only
 * audio licensed for third-party use. TRENDING_AUDIO=music | original_sound | off (default off).
 * Set TRENDING_AUDIO_QUERY to search instead (e.g. "lofi").
 */
export async function pickTrendingAudio() {
  const type = env('TRENDING_AUDIO', 'off');
  if (type === 'off') return null;
  if (host() !== 'graph.facebook.com') {
    log('trending audio needs Facebook Login (IG_GRAPH_HOST=graph.facebook.com); posting without it');
    return null;
  }
  try {
    const params = {audio_type: type, user_id: env('IG_USER_ID')};
    if (process.env.TRENDING_AUDIO_QUERY) params.search_query = process.env.TRENDING_AUDIO_QUERY;
    const res = await call('GET', 'ig_audio', params);
    const list = res.data ?? [];
    const skip = new Set((process.env.TRENDING_AUDIO_SKIP ?? '').split(',').filter(Boolean));
    const pick = list.find((a) => !skip.has(String(a.id)));
    if (!pick) return null;
    log(`trending audio: ${pick.title ?? pick.name ?? ''} ${pick.artist ?? pick.display_artist ?? ''} (${pick.id})`);
    return pick;
  } catch (e) {
    log(`trending audio lookup failed, posting without it: ${e.message}`);
    return null;
  }
}

/** True when a public bucket is configured; otherwise reels are uploaded directly (Facebook Login only). */
export const hasStorage = () => Boolean(process.env.S3_ENDPOINT && process.env.PUBLIC_MEDIA_BASE);

/**
 * Publishes a Reel. Pass videoUrl (public link) OR videoFile (local path, uploaded straight to Instagram
 * with a resumable upload; needs Facebook Login, IG_GRAPH_HOST=graph.facebook.com).
 * trial=true posts it as a Trial Reel (shown to non-followers first; needs eligibility).
 */
export async function publishReel({videoUrl, videoFile, coverUrl, coverOffsetMs, caption, trial = false}) {
  const params = {media_type: 'REELS', caption, share_to_feed: 'true'};
  if (videoUrl) params.video_url = videoUrl;
  else {
    if (host() !== 'graph.facebook.com') throw new Error('Direct upload needs IG_GRAPH_HOST=graph.facebook.com (Facebook Login), or set up S3/R2 storage');
    params.upload_type = 'resumable';
  }
  if (coverUrl) params.cover_url = coverUrl;
  else if (coverOffsetMs != null) params.thumb_offset = String(Math.round(coverOffsetMs));
  if (trial) params.trial_params = JSON.stringify({graduation_strategy: 'SS_PERFORMANCE'});
  const audio = await pickTrendingAudio();
  if (audio)
    // keep the voice-over on top: music quiet underneath
    params.audio_configuration = JSON.stringify({
      audio_id: String(audio.id),
      audio_volume: Number(env('TRENDING_AUDIO_VOLUME', '12')),
      video_volume: 100,
    });
  const {id} = await call('POST', `${env('IG_USER_ID')}/media`, params);
  if (!videoUrl) {
    const data = fs.readFileSync(videoFile);
    log(`uploading ${(data.length / 1e6).toFixed(1)} MB directly to Instagram…`);
    const res = await fetch(`https://rupload.facebook.com/ig-api-upload/${ver()}/${id}`, {
      method: 'POST',
      headers: {
        Authorization: `OAuth ${env('IG_ACCESS_TOKEN')}`,
        offset: '0',
        file_size: String(data.length),
        'Content-Type': 'application/octet-stream',
      },
      body: data,
    });
    const out = await res.json().catch(() => ({}));
    if (!res.ok || out.success === false) throw new Error(`Instagram upload failed: ${JSON.stringify(out)}`);
  }
  log(`reel container ${id}, waiting for Instagram to process…`);
  await waitReady(id);
  return publishContainer(id);
}

/** Publishes a carousel of up to 10 JPEG slides. */
export async function publishCarousel({imageUrls, caption}) {
  const children = [];
  for (const url of imageUrls.slice(0, 10)) {
    const {id} = await call('POST', `${env('IG_USER_ID')}/media`, {image_url: url, is_carousel_item: 'true'});
    children.push(id);
  }
  const {id} = await call('POST', `${env('IG_USER_ID')}/media`, {media_type: 'CAROUSEL', children: children.join(','), caption});
  await waitReady(id, 5);
  return publishContainer(id);
}

export async function insights(mediaId) {
  const metrics = ['reach', 'views', 'likes', 'comments', 'saved', 'shares', 'total_interactions', 'ig_reels_avg_watch_time'];
  const out = {};
  // ask one by one so a renamed/unsupported metric doesn't fail the rest
  for (const m of metrics) {
    try {
      const r = await call('GET', `${mediaId}/insights`, {metric: m});
      out[m] = r.data?.[0]?.values?.[0]?.value ?? r.data?.[0]?.total_value?.value ?? null;
    } catch {
      out[m] = null;
    }
  }
  return out;
}

/** Long-lived Instagram-login tokens last 60 days; refresh before they expire. */
export async function refreshToken() {
  const url = `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${env('IG_ACCESS_TOKEN')}`;
  const res = await fetch(url);
  return res.json();
}
