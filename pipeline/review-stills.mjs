// Renders one key frame per scene (with captions) for Claude's frame review: out/<slug>/review-NN.jpg
// usage: node pipeline/review-stills.mjs <slug>
import fs from 'node:fs';
import path from 'node:path';
import {keyFrames, loadProps, renderStills} from './render.mjs';
import {latestSlug, outDir} from './util.mjs';

const slug = process.argv[2] || latestSlug();
const dir = outDir(slug);
for (const f of fs.readdirSync(dir)) if (f.startsWith('review-')) fs.rmSync(path.join(dir, f));
const {timings} = loadProps(slug);
// the first frame (what people see while scrolling) + each scene at 70% of its length
const frames = [2, ...keyFrames(timings, 30, 0.7)];
const files = await renderStills(slug, frames, {prefix: 'review'});
console.log(`rendered ${files.length} review frames → ${dir}`);
