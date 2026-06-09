import { readdir, readFile } from 'node:fs/promises';

const rootUrl = new URL('../', import.meta.url);
const readText = (path) => readFile(new URL(path, rootUrl), 'utf8');

const [readme, docsReadme, releaseEntries] = await Promise.all([
  readText('README.md'),
  readText('docs/README.md'),
  readdir(new URL('docs/releases/', rootUrl), { withFileTypes: true }),
]);

const releaseDirs = releaseEntries
  .filter((entry) => entry.isDirectory() && /^v\d+\.\d+-/.test(entry.name))
  .map((entry) => entry.name)
  .sort();

const missing = [];

if (!readme.includes('[`docs/`](docs/README.md)')) {
  missing.push('README.md: link to docs/README.md');
}

if (!readme.includes('https://jeremyaaron.github.io/haunted-apex/')) {
  missing.push('README.md: playable GitHub Pages URL');
}

for (const releaseDir of releaseDirs) {
  const link = `releases/${releaseDir}/`;
  const rootLink = `docs/releases/${releaseDir}/`;

  if (!docsReadme.includes(link)) {
    missing.push(`docs/README.md: ${link}`);
  }

  if (!readme.includes(rootLink)) {
    missing.push(`README.md: ${rootLink}`);
  }
}

if (missing.length > 0) {
  console.error('Documentation links are incomplete. Missing:');

  for (const entry of missing) {
    console.error(`- ${entry}`);
  }

  process.exitCode = 1;
} else {
  console.log(`Documentation links verified for ${releaseDirs.length} release folders.`);
}
