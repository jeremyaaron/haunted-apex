# Haunted Apex

Haunted Apex is a cyber-noir strategy/sim prototype. The current implementation target is **District Zero**, a browser-based Angular vertical slice described in:

- `DistrictZero-TDD.md`
- `DistrictZero-ImplementationPlan.md`
- `Layer1.md`
- `Layer1A.md`
- `v0.md`

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

## Verification

Build:

```bash
npm run build
```

Tests:

```bash
npm test
```

Phase 0 only establishes the Angular shell, Node pin, and source layout. Game engine implementation begins in Phase 1.
