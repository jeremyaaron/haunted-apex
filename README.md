# Haunted Apex

Haunted Apex is a cyber-noir strategy/sim prototype. The latest release is **v0.2.0: Rival Territory**. The current development target is **v0.3.0: The Roster**.

Development documentation is organized under [`docs/`](docs/README.md):

- [`docs/foundation/`](docs/foundation/) contains the original product and simulation direction.
- [`docs/releases/v0.1-district-zero/`](docs/releases/v0.1-district-zero/) preserves the District Zero specification, TDD, and implementation plan.
- [`docs/releases/v0.2-rival-territory/`](docs/releases/v0.2-rival-territory/) contains the Rival Territory direction, clarifications, TDD, and implementation plan.
- [`docs/releases/v0.3-the-roster/`](docs/releases/v0.3-the-roster/) contains The Roster direction, clarifications, TDD, and implementation plan.

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

The deployment workflow runs after pushes to `main` and can also be started manually from the
repository's Actions tab.

## Verification

Build:

```bash
npm run build
```

Tests:

```bash
npm test
```

Verify release references before merging to `main`:

```bash
npm run check:readme
```
