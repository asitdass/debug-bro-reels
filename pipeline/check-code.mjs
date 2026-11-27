// Compiles and runs the four solutions in an episode's notes.json against their tests, so the PDF never ships broken code.
// usage: node pipeline/check-code.mjs <slug>
// Needs python3, node, a C++ compiler and a JDK. A missing tool is reported as NOT CHECKED (exit code 2), never as a pass.
// It runs the code from notes.json on this machine: read it first if you did not write it.
import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {epDir, latestSlug, readJSON} from './util.mjs';

const slug = process.argv[2] || latestSlug();
const notes = readJSON(path.join(epDir(slug), 'notes.json'), null);
if (!notes) {
  console.error(`no notes.json for ${slug}`);
  process.exit(1);
}

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dsa-code-'));
const works = (cmd) => spawnSync(cmd, ['-version'], {stdio: 'ignore'}).status === 0 || spawnSync(cmd, ['--version'], {stdio: 'ignore'}).status === 0;
const run = (cmd, args) => spawnSync(cmd, args, {cwd: dir, encoding: 'utf8', timeout: 60_000});

const LANGS = {
  python: {file: 'solution.py', need: ['python3'], steps: [['python3', ['solution.py']]]},
  javascript: {file: 'solution.js', need: ['node'], steps: [['node', ['solution.js']]]},
  cpp: {file: 'solution.cpp', need: ['g++'], steps: [['g++', ['-std=c++17', '-Wall', 'solution.cpp', '-o', 'solution']], ['./solution', []]]},
  // the test snippet declares "public class Main"; imports in the solution stay at the top of the file
  java: {file: 'Main.java', need: ['javac', 'java'], steps: [['javac', ['Main.java']], ['java', ['-cp', '.', 'Main']]]},
};

let failed = 0;
let skipped = 0;
for (const [lang, cfg] of Object.entries(LANGS)) {
  const entry = notes.code?.[lang];
  if (!entry) {
    console.log(`FAIL ${lang}: missing from notes.json`);
    failed++;
    continue;
  }
  if (!cfg.need.every(works)) {
    console.log(`NOT CHECKED ${lang}: ${cfg.need.join(' / ')} is not installed here`);
    skipped++;
    continue;
  }
  fs.writeFileSync(path.join(dir, cfg.file), `${entry.code}\n${entry.test}\n`);
  let bad = null;
  for (const [cmd, args] of cfg.steps) {
    const r = run(cmd, args);
    if (r.status !== 0) {
      bad = (r.stderr || r.stdout || r.error?.message || `exit ${r.status}`).trim().split('\n').slice(-6).join('\n');
      break;
    }
  }
  console.log(bad ? `FAIL ${lang}:\n${bad}` : `PASS ${lang}`);
  if (bad) failed++;
}
fs.rmSync(dir, {recursive: true, force: true});
process.exit(failed ? 1 : skipped ? 2 : 0);
