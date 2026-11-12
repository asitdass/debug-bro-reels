import path from 'node:path';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import 'dotenv/config';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const epDir = (slug) => path.join(ROOT, 'episodes', slug);
export const publicEpDir = (slug) => {
  const d = path.join(ROOT, 'public', 'episodes', slug);
  fs.mkdirSync(d, {recursive: true});
  return d;
};
export const outDir = (slug) => {
  const d = path.join(ROOT, 'out', slug);
  fs.mkdirSync(d, {recursive: true});
  return d;
};
export const log = (...a) => console.log(`[${new Date().toISOString().slice(11, 19)}]`, ...a);

const epNumber = (slug) => readJSON(path.join(ROOT, 'episodes', slug, 'episode.json'), {}).number ?? 0;

export function latestSlug() {
  const dirs = fs
    .readdirSync(path.join(ROOT, 'episodes'), {withFileTypes: true})
    .filter((d) => d.isDirectory() && fs.existsSync(path.join(ROOT, 'episodes', d.name, 'episode.json')))
    .map((d) => d.name)
    .sort((a, b) => epNumber(a) - epNumber(b) || a.localeCompare(b));
  if (!dirs.length) throw new Error('No episodes found in episodes/');
  return dirs[dirs.length - 1];
}

export function readJSON(p, fallback) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return fallback;
  }
}

export function writeJSON(p, v) {
  fs.mkdirSync(path.dirname(p), {recursive: true});
  fs.writeFileSync(p, JSON.stringify(v, null, 2));
}

export const env = (k, def) => {
  const v = process.env[k];
  if (v === undefined || v === '') {
    if (def !== undefined) return def;
    throw new Error(`Missing env var ${k} (see .env.example)`);
  }
  return v;
};
