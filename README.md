# Haunted Apex

Haunted Apex is a cyber-noir strategy/sim prototype. The completed first release is **v0.1.0: District Zero**. The current development target is **v0.2.0: Rival Territory**.

Development documentation is organized under [`docs/`](docs/README.md):

- [`docs/foundation/`](docs/foundation/) contains the original product and simulation direction.
- [`docs/releases/v0.1-district-zero/`](docs/releases/v0.1-district-zero/) preserves the District Zero specification, TDD, and implementation plan.
- [`docs/releases/v0.2-rival-territory/`](docs/releases/v0.2-rival-territory/) contains the Rival Territory direction, clarifications, TDD, and implementation plan.

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

GitHub Pages deployment is planned for v0.2.0 at:

```text
https://jeremyaaron.github.io/haunted-apex/
```

The README will identify it as live after the first successful deployment.

## Verification

Build:

```bash
npm run build
```

Tests:

```bash
npm test
```
