import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { build } from 'esbuild';

if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`Usage: npm run validate:handler

Runs the v0.9 Handler validation gate.

Environment options:
  HANDLER_VALIDATION_TRACE=1          Include decision traces in failure rows.
  HANDLER_VALIDATION_CAMPAIGN=<id>    Validate one Campaign Tension.
  HANDLER_VALIDATION_LIMIT=<count>    Validate the first N seeds per selected campaign.
  HANDLER_VALIDATION_SEEDS=<csv>      Validate specific registered Standard seeds.
`);
  process.exit(0);
}

const tempDir = await mkdtemp(path.join(tmpdir(), 'haunted-apex-handler-validation-'));
const bundlePath = path.join(tempDir, 'handler-validation.mjs');

try {
  await build({
    bundle: true,
    format: 'esm',
    platform: 'node',
    target: 'node24',
    outfile: bundlePath,
    logLevel: 'silent',
    stdin: {
      loader: 'ts',
      resolveDir: process.cwd(),
      contents: `
        import { CAMPAIGN_TENSION_DEFINITIONS } from './src/app/engine/content';
        import {
          formatHandlerValidationGateReport,
          runHandlerStandardValidation,
          runHandlerTrainingValidation,
        } from './src/app/engine/harness/handler-validation-runner';
        import {
          STANDARD_VALIDATION_SEEDS,
          STANDARD_VALIDATION_TOTAL_RUNS,
        } from './src/app/engine/advisor';

        const collectFailureTrace = process.env['HANDLER_VALIDATION_TRACE'] === '1';
        const campaignFilter = process.env['HANDLER_VALIDATION_CAMPAIGN'];
        const seedLimit = Number.parseInt(process.env['HANDLER_VALIDATION_LIMIT'] ?? '', 10);
        const seedFilter = (process.env['HANDLER_VALIDATION_SEEDS'] ?? '')
          .split(',')
          .map((seed) => seed.trim())
          .filter(Boolean);
        const campaigns = campaignFilter
          ? CAMPAIGN_TENSION_DEFINITIONS.filter((campaign) => campaign.id === campaignFilter)
          : CAMPAIGN_TENSION_DEFINITIONS;

        const training = runHandlerTrainingValidation({ collectFailureTrace });
        console.log(
          \`handler_training_progress passed=\${training.passed} wins=\${training.wins} losses=\${training.losses} invalidRecommendations=\${training.invalidRecommendations}\`,
        );
        const fullStandardGate =
          !campaignFilter && !Number.isFinite(seedLimit) && seedFilter.length === 0;

        const standardReports = campaigns.map((campaign) => {
          const seeds = STANDARD_VALIDATION_SEEDS[campaign.id] ?? [];
          const filteredSeeds = seedFilter.length > 0
            ? seeds.filter((seed) => seedFilter.includes(seed))
            : seeds;
          const selectedSeeds = Number.isFinite(seedLimit) && seedLimit > 0
            ? filteredSeeds.slice(0, seedLimit)
            : filteredSeeds;
          const report = runHandlerStandardValidation({
            collectFailureTrace,
            seedSet: {
              [campaign.id]: selectedSeeds,
            },
          });

          console.log(
            \`handler_standard_progress campaign=\${campaign.id} runs=\${report.totalRuns} wins=\${report.wins} losses=\${report.losses} invalidRecommendations=\${report.invalidRecommendations} softlocks=\${report.softlocks} stalls=\${report.stalls} passed=\${report.passed}\`,
          );

          return report;
        });

        const standard = {
          kind: 'standard',
          passed:
            standardReports.every((report) => report.passed) &&
            (!fullStandardGate ||
              standardReports.reduce((total, report) => total + report.totalRuns, 0) ===
                STANDARD_VALIDATION_TOTAL_RUNS),
          expectedRuns: campaignFilter || Number.isFinite(seedLimit)
            ? standardReports.reduce((total, report) => total + report.expectedRuns, 0)
            : STANDARD_VALIDATION_TOTAL_RUNS,
          totalRuns: standardReports.reduce((total, report) => total + report.totalRuns, 0),
          wins: standardReports.reduce((total, report) => total + report.wins, 0),
          losses: standardReports.reduce((total, report) => total + report.losses, 0),
          invalidStates: standardReports.reduce((total, report) => total + report.invalidStates, 0),
          invalidRecommendations: standardReports.reduce(
            (total, report) => total + report.invalidRecommendations,
            0,
          ),
          softlocks: standardReports.reduce((total, report) => total + report.softlocks, 0),
          stalls: standardReports.reduce((total, report) => total + report.stalls, 0),
          failures: standardReports.flatMap((report) => report.failures),
          results: standardReports.flatMap((report) => report.results),
        };
        const report = {
          passed: training.passed && standard.passed,
          training,
          standard,
          failures: [...training.failures, ...standard.failures],
        };

        console.log(formatHandlerValidationGateReport(report));

        if (!report.passed) {
          process.exitCode = 1;
        }
      `,
    },
  });

  await import(pathToFileURL(bundlePath).href);
} finally {
  await rm(tempDir, { recursive: true, force: true });
}
