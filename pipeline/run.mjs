// One command, whole pipeline:  validate → voice → render → approval → publish → log
//
//   npm run reel                         newest episode, all steps
//   npm run reel -- --slug=ep01-tatkal-crash
//   npm run reel -- --no-publish         stop after rendering
//   npm run reel -- --only=voice|render|publish|carousel
//   npm run reel -- --trial              publish as a Trial Reel
//
// POST_MODE=manual (default while the Meta API is blocked): nothing is posted. The reel, its cover and the ready-to-paste
// caption (with [keywords] and hashtags) go to Telegram, and the episode is logged as delivered. POST_MODE=auto posts.
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

  const caption = fullCaption(episode);

  if (args['no-publish'] || (only && !['publish', 'carousel'].includes(only))) {
    // dry run: still send the preview + caption to your phone so you can watch it
    if (files?.video && process.env.TELEGRAM_BOT_TOKEN) {
      const {sendPreview, sendText} = await import('./telegram.mjs');
      faststart(files.video);
      await sendPreview({video: files.video, caption: `Preview (not logged): ${slug}`}).catch((e) => log(`preview not sent: ${e.message}`));
      await sendText(caption).catch(() => {});
    }
    return;
  }

  const dir = outDir(slug);
  files ??= {
    video: path.join(dir, 'reel.mp4'),
    cover: path.join(dir, 'cover.jpg'),
    slides: fs.readdirSync(dir).filter((f) => f.startsWith('slide-')).sort().map((f) => path.join(dir, f)),
  };

  if ((process.env.POST_MODE || 'manual') === 'manual') {
    const {sendPreview, sendText, sendPhotos} = await import('./telegram.mjs');
    if (only === 'carousel') {
      await sendPhotos(files.slides, `Carousel for ${slug}: post these slides in this order.`);
      await sendText(caption);
      return;
    }
    faststart(files.video);
    const reviewFile = path.join(outDir(slug), 'review.md');
    const review = fs.existsSync(reviewFile) ? fs.readFileSync(reviewFile, 'utf8').trim().split('\n').slice(-1)[0] : '';
    await sendPreview({
      video: files.video,
      caption: `Debug Bro ${String(episode.number).padStart(2, '0')}: ready to post\n${episode.title}\n\nCaption is in the next message (tap and hold to copy). Post between 6 and 9 pm.${review ? `\n\n${review}` : ''}`,
    });
    if (fs.existsSync(files.cover)) await sendPhotos([files.cover], 'Cover: set it in Edit cover (the grid shows this)').catch(() => {});
    await sendText(caption);
    await sendText(postingChecklist(episode)).catch(() => {});
    // the comment-keyword freebie: a PDF of the reel's key frames, for Asit to DM to everyone who comments the keyword
    if (episode.leadMagnet && files.slides?.length) {
      const pdf = path.join(outDir(slug), `${episode.leadMagnet.keyword.toLowerCase()}.pdf`);
      const py = process.env.PYTHON || 'python3';
      const r = spawnSync(py, [path.join(ROOT, 'pipeline/make_pdf.py'), pdf, ...files.slides]);
      if (r.status === 0) {
        const {sendFile} = await import('./telegram.mjs');
        await sendFile(pdf, `Freebie for comments "${episode.leadMagnet.keyword}": ${episode.leadMagnet.promise}. DM this PDF to everyone who comments ${episode.leadMagnet.keyword}.`).catch(() => {});
      }
    }
    record({kind: 'reel', delivered: 'telegram'});
    log('sent to Telegram for manual posting');
    return;
  }

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

  faststart(files.video);

  if (process.env.TELEGRAM_BOT_TOKEN && process.env.APPROVAL !== 'off') {
    // put Claude's frame review on top of the Telegram message, if there is one
    const reviewFile = path.join(outDir(slug), 'review.md');
    const review = fs.existsSync(reviewFile) ? fs.readFileSync(reviewFile, 'utf8').trim().split('\n').slice(-1)[0] : '';
    const answer = await askApproval({video: files.video, caption: review ? `${review}\n\n${caption}` : caption, slug});
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
    // the cover is the hook frame once its headline has animated in
    const opts = {coverOffsetMs: 1500, caption, trial: Boolean(args.trial)};
    try {
      res = await publishReel({videoFile: files.video, ...opts});
    } catch (e) {
      // direct upload refused: publish the file on the repo's public "media" branch and let Instagram fetch it
      log(`direct upload failed (${e.message}); retrying with a public link`);
      const {publishToMediaBranch} = await import('./github-media.mjs');
      const videoUrl = await publishToMediaBranch(files.video, `${slug}/reel.mp4`);
      res = await publishReel({videoUrl, ...opts});
    }
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

/**
 * What Asit does by hand when posting (manual mode). Each line is something the outlier accounts do on every reel
 * (see data/swipe.md, 26 Nov 2026 study).
 */
export function postingChecklist(episode) {
  const lines = ['Posting checklist:'];
  lines.push('1. Cover: pick cover.jpg (or the first frame). Never a blank frame: it is the grid thumbnail.');
  lines.push('2. Audio: keep the original audio. Do NOT add a trending song under the voice-over (every outlier we studied posts "Original audio").');
  if (episode.leadMagnet) lines.push(`3. Pin this comment right after posting:\nComment "${episode.leadMagnet.keyword}" for ${episode.leadMagnet.promise}. DM mein bhejta hoon.`);
  const quiz = episode.scenes.find((s) => s.type === 'quiz');
  if (quiz) lines.push(`4. Quiz answer: after ~2 hours, reply to the top comments and pin:\nAnswer: ${String.fromCharCode(65 + quiz.answer)} (${quiz.options[quiz.answer]}). ${quiz.why}`);
  lines.push('5. Reply to every comment in the first hour, and DM the PDF to everyone who comments the keyword.');
  return lines.join('\n\n');
}

/** Instagram caption: the text, then search keywords in [brackets], then hashtags. */
export function fullCaption(episode) {
  const kw = (episode.keywords ?? []).map((k) => `[${k}]`).join(' ');
  return [episode.caption, kw, episode.hashtags.join(' ')].filter(Boolean).join('\n\n').slice(0, 2200);
}

/** Moves the MP4 index to the front of the file (Instagram processes such files more reliably). */
function faststart(file) {
  const tmp = file.replace(/\.mp4$/, '.fs.mp4');
  const r = spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', file, '-c', 'copy', '-movflags', '+faststart', tmp]);
  if (r.status === 0) fs.renameSync(tmp, file);
  else log('faststart skipped (ffmpeg not available)');
}

main().catch(async (e) => {
  console.error(e);
  try {
    const {notify} = await import('./telegram.mjs');
    await notify(`Debug Bro pipeline failed on ${slug}: ${e.message}`);
  } catch {}
  process.exit(1);
});
