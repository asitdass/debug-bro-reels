// Renders the reel MP4, the cover JPG and carousel slides for one episode.
import path from 'node:path';
import fs from 'node:fs';
import {bundle} from '@remotion/bundler';
import {renderMedia, renderStill, selectComposition} from '@remotion/renderer';
import {estimateTimings} from '../src/estimate.js';
import {ROOT, epDir, log, outDir} from './util.mjs';

let bundled = null;
async function getBundle() {
  if (!bundled) {
    log('bundling Remotion project…');
    bundled = await bundle({entryPoint: path.join(ROOT, 'src/index.ts'), publicDir: path.join(ROOT, 'public')});
  }
  return bundled;
}

const browserExecutable = process.env.REMOTION_BROWSER || null;

export function loadProps(slug, {allowEstimate = true} = {}) {
  const episode = JSON.parse(fs.readFileSync(path.join(epDir(slug), 'episode.json'), 'utf8'));
  const tPath = path.join(epDir(slug), 'timings.json');
  let timings;
  if (fs.existsSync(tPath)) timings = JSON.parse(fs.readFileSync(tPath, 'utf8'));
  else if (allowEstimate) timings = estimateTimings(episode);
  else throw new Error(`No timings.json for ${slug}; run the voice step first`);
  return {episode, timings};
}

/** Frame in the middle-to-late part of each scene, where its animation has settled. */
export function keyFrames(timings, fps = 30, at = 0.8) {
  return timings.scenes.map((s, i) => {
    const start = s.startMs;
    const end = i < timings.scenes.length - 1 ? timings.scenes[i + 1].startMs : timings.totalMs;
    return Math.round(((start + (end - start) * at) / 1000) * fps);
  });
}

export async function renderStills(slug, frames, {hideCaptions = false, prefix = 'frame'} = {}) {
  const serveUrl = await getBundle();
  const inputProps = {...loadProps(slug), hideCaptions};
  const comp = await selectComposition({serveUrl, id: 'Reel', inputProps, browserExecutable});
  const dir = outDir(slug);
  const files = [];
  for (const [i, frame] of frames.entries()) {
    const file = path.join(dir, `${prefix}-${String(i + 1).padStart(2, '0')}.jpg`);
    await renderStill({composition: comp, serveUrl, output: file, frame: Math.min(frame, comp.durationInFrames - 1), inputProps, imageFormat: 'jpeg', jpegQuality: 92, browserExecutable});
    files.push(file);
  }
  return files;
}

export async function renderReel(slug) {
  const serveUrl = await getBundle();
  const inputProps = loadProps(slug);
  const dir = outDir(slug);
  const comp = await selectComposition({serveUrl, id: 'Reel', inputProps, browserExecutable});
  const tmp = path.join(dir, 'reel.part.mp4');
  const final = path.join(dir, 'reel.mp4');
  log(`rendering ${comp.durationInFrames} frames (${(comp.durationInFrames / 30).toFixed(1)}s)…`);
  let last = -1;
  await renderMedia({
    composition: comp,
    serveUrl,
    codec: 'h264',
    crf: 18,
    x264Preset: 'veryfast',
    audioBitrate: '192k',
    pixelFormat: 'yuv420p',
    outputLocation: tmp,
    inputProps,
    browserExecutable,
    onProgress: ({progress}) => {
      const pct = Math.floor(progress * 10) * 10;
      if (pct !== last) {
        last = pct;
        log(`  ${pct}%`);
      }
    },
  });
  fs.renameSync(tmp, final);

  // Cover (profile grid) and carousel slides (key frame of each scene, no captions).
  const cover = path.join(dir, 'cover.jpg');
  const coverComp = await selectComposition({serveUrl, id: 'Cover', inputProps: {episode: inputProps.episode}, browserExecutable});
  await renderStill({composition: coverComp, serveUrl, output: cover, inputProps: {episode: inputProps.episode}, imageFormat: 'jpeg', jpegQuality: 92, browserExecutable});

  const pick = pickCarouselScenes(inputProps.episode);
  const frames = keyFrames(inputProps.timings).filter((_, i) => pick.includes(i));
  const slides = await renderStills(slug, frames, {hideCaptions: true, prefix: 'slide'});
  log(`done → ${final}`);
  return {video: final, cover, slides};
}

/** Carousel = up to 8 scenes that read well as a still (skip pure-motion scenes). */
function pickCarouselScenes(episode) {
  const still = ['hook', 'code', 'hotrow', 'solution', 'flow', 'compare', 'rule', 'counter', 'chat'];
  return episode.scenes.map((s, i) => (still.includes(s.type) ? i : -1)).filter((i) => i >= 0).slice(0, 8);
}
