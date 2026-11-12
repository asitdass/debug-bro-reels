// One command, whole pipeline:  validate → voice → render → approval → publish → log
//
//   npm run reel                         newest episode, all steps
//   npm run reel -- --slug=ep01-tatkal-crash
//   npm run reel -- --no-publish         stop after rendering
//   npm run reel -- --only=voice|render|publish|carousel
//   npm run reel -- --trial              publish as a Trial Reel
import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {validate} from './validate.mjs';
import {renderReel} from './render.mjs';
import {ROOT, epDir, latestSlug, log, outDir, readJSON, writeJSON} from './util.mjs';

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
  }),
);
const slug =
  args.slug === 'last-published'
    ? readJSON(path.join(ROOT, 'data/published.json'), []).filter((p) => p.kind === 'reel').at(-1)?.slug
    : args.slug || latestSlug();
if (!slug) throw new Error('no episode to work on');
const only = args.only;
const want = (step) => !only || only === step;
const PUBLISHED = path.join(ROOT, 'data/published.json');

async function main() {
  log(`episode: ${slug}`);
  const episode = readJSON(path.join(epDir(slug), 'episode.json'));

  if (want('validate') || want('voice') || want('render')) {
    const v = validate(slug);
    v.warnings.forEach((w) => log(`warn: ${w}`));
    if (!v.ok) {
      v.errors.forEach((e) => log(`ERROR: ${e}`));
      process.exit(1);
    }
  }

  if (want('voice')) {
    log('voice-over…');
    const py = process.env.PYTHON || (process.platform === 'win32' ? 'python' : 'python3');
    const r = spawnSync(py, [path.join(ROOT, 'pipeline/tts.py'), slug], {stdio: 'inherit'});
    if (r.status !== 0) throw new Error('voice step failed');
  }

  let files;
  if (want('render')) files = await renderReel(slug);

  if (args['no-publish'] || (only && !['publish', 'carousel'].includes(only))) {
    // dry run: still send the preview to your phone so you can watch it
    if (files?.video && process.env.TELEGRAM_BOT_TOKEN) {
      const {sendPreview} = await import('./telegram.mjs');
      await sendPreview({video: files.video, caption: `Preview (not posted): ${slug}`}).catch((e) => log(`preview not sent: ${e.message}`));
    }
    return;
  }

  const dir = outDir(slug);
  files ??= {
    video: path.join(dir, 'reel.mp4'),
    cover: path.join(dir, 'cover.jpg'),
    slides: fs.readdirSync(dir).filter((f) => f.startsWith('slide-')).sort().map((f) => path.join(dir, f)),
  };
  const caption = `${episode.caption}\n\n${episode.hashtags.join(' ')}`;

  if (!process.env.IG_ACCESS_TOKEN) {
    log(`rendered → ${files.video}`);
    log('IG_ACCESS_TOKEN not set, so nothing was posted. Fill in .env to auto-publish.');
    return;
  }

  const {uploadPublic, publishReel, publishCarousel, hasStorage} = await import('./instagram.mjs');
  // Without S3/R2, carousel images are served from the repo's "media" branch (pushed by the workflow).
  const rawBase =
    process.env.MEDIA_RAW_BASE ||
    (process.env.GITHUB_REPOSITORY ? `https://raw.githubusercontent.com/${process.env.GITHUB_REPOSITORY}/media` : null);
  const {askApproval, notify} = await import('./telegram.mjs');

  if (only === 'carousel') {
    const urls = [];
    for (const [i, f] of files.slides.entries()) {
      if (hasStorage()) urls.push(await uploadPublic(f, `${slug}/slide-${i + 1}.jpg`));
      else if (rawBase) urls.push(`${rawBase}/${slug}/${path.basename(f)}`);
      else throw new Error('carousel needs public image URLs: set S3/R2 or MEDIA_RAW_BASE');
    }
    const res = await publishCarousel({imageUrls: urls, caption});
    record({kind: 'carousel', ...res});
    await notify(`Carousel posted: ${res.permalink ?? res.mediaId}`);
    return;
  }

  if (process.env.TELEGRAM_BOT_TOKEN && process.env.APPROVAL !== 'off') {
    const answer = await askApproval({video: files.video, caption, slug});
    if (answer !== 'approve') {
      log('skipped by you on Telegram; not posting.');
      return;
    }
  }

  let res;
  if (hasStorage()) {
    const videoUrl = await uploadPublic(files.video, `${slug}/reel.mp4`);
    const coverUrl = await uploadPublic(files.cover, `${slug}/cover.jpg`);
    res = await publishReel({videoUrl, coverUrl, caption, trial: Boolean(args.trial)});
  } else {
    // direct upload; the cover is the hook frame once its headline has animated in
    res = await publishReel({videoFile: files.video, coverOffsetMs: 1500, caption, trial: Boolean(args.trial)});
  }
  log(`posted: ${res.permalink ?? res.mediaId}`);
  record({kind: args.trial ? 'trial-reel' : 'reel', ...res});
  await notify(`Reel posted: ${res.permalink ?? res.mediaId}`);

  function record(extra) {
    const list = readJSON(PUBLISHED, []);
    list.push({slug, topic: episode.topic, pillar: episode.pillar, title: episode.title, postedAt: new Date().toISOString(), ...extra});
    writeJSON(PUBLISHED, list);
  }
}

main().catch(async (e) => {
  console.error(e);
  try {
    const {notify} = await import('./telegram.mjs');
    await notify(`Debug Bro pipeline failed on ${slug}: ${e.message}`);
  } catch {}
  process.exit(1);
});
