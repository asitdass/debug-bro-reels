// Publishes a file on the repo's public "media" branch via the GitHub API and returns its raw URL.
// Used when Instagram's direct upload is refused and no S3/R2 bucket is configured.
import fs from 'node:fs';
import {env, log} from './util.mjs';

const api = (p, init = {}) =>
  fetch(`https://api.github.com/repos/${env('GITHUB_REPOSITORY')}/${p}`, {
    ...init,
    headers: {Authorization: `Bearer ${env('GITHUB_TOKEN')}`, Accept: 'application/vnd.github+json', ...(init.headers ?? {})},
  });

export async function publishToMediaBranch(file, relPath, branch = 'media') {
  // make sure the branch exists (branch off the default branch the first time)
  let ref = await api(`git/ref/heads/${branch}`);
  if (ref.status === 404) {
    const main = await (await api(`git/ref/heads/${process.env.GITHUB_REF_NAME || 'main'}`)).json();
    const created = await api('git/refs', {method: 'POST', body: JSON.stringify({ref: `refs/heads/${branch}`, sha: main.object.sha})});
    if (!created.ok) throw new Error(`cannot create ${branch} branch: ${await created.text()}`);
  }
  const existing = await api(`contents/${relPath}?ref=${branch}`);
  const sha = existing.ok ? (await existing.json()).sha : undefined;
  const put = await api(`contents/${relPath}`, {
    method: 'PUT',
    body: JSON.stringify({message: `media: ${relPath}`, branch, sha, content: fs.readFileSync(file).toString('base64')}),
  });
  if (!put.ok) throw new Error(`GitHub upload failed: ${await put.text()}`);
  const url = `https://raw.githubusercontent.com/${env('GITHUB_REPOSITORY')}/${branch}/${relPath}`;
  log(`published ${relPath} → ${url}`);
  await new Promise((r) => setTimeout(r, 15000)); // let the raw CDN pick it up
  return url;
}
