import { readFile } from 'node:fs/promises';

const status = JSON.parse(
  await readFile(new URL('../docs/releases/release-status.json', import.meta.url), 'utf8'),
);
const readme = await readFile(new URL('../README.md', import.meta.url), 'utf8');
const docsReadme = await readFile(new URL('../docs/README.md', import.meta.url), 'utf8');

const requiredRootText = [
  `latest release is **${status.latestRelease.version}: ${status.latestRelease.name}**`,
  `current development target is **${status.developmentTarget.version}: ${status.developmentTarget.name}**`,
  status.latestRelease.docsPath,
  status.developmentTarget.docsPath,
];
const requiredDocsText = [
  `## ${status.latestRelease.version}: ${status.latestRelease.name}`,
  `## ${status.developmentTarget.version}: ${status.developmentTarget.name}`,
];
const missing = [
  ...requiredRootText
    .filter((text) => !readme.includes(text))
    .map((text) => `README.md: ${text}`),
  ...requiredDocsText
    .filter((text) => !docsReadme.includes(text))
    .map((text) => `docs/README.md: ${text}`),
];

if (missing.length > 0) {
  console.error('README release status is stale. Missing:');

  for (const entry of missing) {
    console.error(`- ${entry}`);
  }

  process.exitCode = 1;
} else {
  console.log(
    `README status verified: ${status.latestRelease.version} released, ${status.developmentTarget.version} in development.`,
  );
}
