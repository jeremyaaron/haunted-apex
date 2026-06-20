# Haunted Apex

Haunted Apex is a cyber-noir strategy/sim prototype. The current playable browser build is published through GitHub Pages, and historical design documents are preserved under `docs/`.

Development documentation is organized under [`docs/`](docs/README.md):

- [`docs/foundation/`](docs/foundation/) contains the original product and simulation direction.
- [`docs/releases/v0.1-district-zero/`](docs/releases/v0.1-district-zero/) preserves the District Zero specification, TDD, and implementation plan.
- [`docs/releases/v0.2-rival-territory/`](docs/releases/v0.2-rival-territory/) contains the Rival Territory direction, clarifications, TDD, and implementation plan.
- [`docs/releases/v0.3-the-roster/`](docs/releases/v0.3-the-roster/) contains The Roster direction, clarifications, TDD, and implementation plan.
- [`docs/releases/v0.4-the-black-ledger/`](docs/releases/v0.4-the-black-ledger/) contains The Black Ledger direction, clarifications, TDD, implementation plan, and release notes.
- [`docs/releases/v0.5-entanglements/`](docs/releases/v0.5-entanglements/) contains the Entanglements direction, clarifications, TDD, implementation plan, and release notes.
- [`docs/releases/v0.6-fronts/`](docs/releases/v0.6-fronts/) contains the Fronts direction, clarifications, TDD, implementation plan, and release notes.
- [`docs/releases/v0.7-the-accords/`](docs/releases/v0.7-the-accords/) contains The Accords direction, clarifications, TDD, implementation plan, and release notes.
- [`docs/releases/v0.8-the-city-wakes/`](docs/releases/v0.8-the-city-wakes/) contains The City Wakes direction, clarifications, TDD, implementation plan, and release notes.
- [`docs/releases/v0.9-the-handler/`](docs/releases/v0.9-the-handler/) contains The Handler direction, clarifications, TDD, implementation plan, and release notes.
- [`docs/releases/v0.9.1-signal-clarity/`](docs/releases/v0.9.1-signal-clarity/) contains Signal Clarity direction, clarifications, TDD, and implementation plan.

## Runtime

This project is pinned to Node `24.16.0` via `.nvmrc`.

```bash
nvm use
npm install
```

If `nvm use` reports that the version is missing:

```bash
nvm install
```

## Development

Start the Angular dev server:

```bash
npm start
```

Then open:

```text
http://localhost:4200/
```

## Playable Build

Play the current prototype:

https://jeremyaaron.github.io/haunted-apex/

The Pages deployment workflow runs after pushes to `main` and can also be started manually from the
repository's Actions tab. It verifies docs, typechecks the app, builds the production artifact with
the `/haunted-apex/` base href, and deploys that static build.

Browser tests are available as a manual Actions workflow. They are intentionally not run on every
push or pull request because Chrome Headless has been flaky in hosted CI, and a flaky browser runner
should not put red Xs on otherwise valid builds. Run the manual browser workflow when you want an
extra CI signal; use local test runs for release validation.

## Verification

Build:

```bash
npm run build
```

Tests:

```bash
npm test
```

Verify documentation links:

```bash
npm run check:docs
```
