// What should this scheduled DSA-101 run do? Prints GitHub step outputs:
//   action=write    make the next question
//   action=deliver  slug=<slug>   a question was written but never delivered: send that one
//   action=skip     this slot already got its reel (backup cron, or a late run)
import fs from 'node:fs';
import path from 'node:path';
import {ROOT, readJSON} from './util.mjs';

const SLOT_HOURS = 8; // the two daily slots are 13 h and 11 h apart
const published = readJSON(path.join(ROOT, 'data/published.json'), []);
const sent = new Set(published.map((p) => p.slug));
const recent = published.some((p) => p.slug.startsWith('dsa101-') && Date.now() - new Date(p.postedAt).getTime() < SLOT_HOURS * 3600_000);
const pending = fs
  .readdirSync(path.join(ROOT, 'episodes'))
  .filter((d) => d.startsWith('dsa101-') && fs.existsSync(path.join(ROOT, 'episodes', d, 'episode.json')) && !sent.has(d))
  .sort();

// a run started by hand ("Run workflow") ignores the slot guard
if (recent && process.env.MANUAL !== 'true') console.log('action=skip');
else if (pending.length) console.log(`action=deliver\nslug=${pending[0]}`);
else console.log('action=write');
