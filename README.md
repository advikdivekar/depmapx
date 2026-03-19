<div align="center">

<h1>depmapx</h1>

<p><strong>AST-driven dependency analyzer and CI/CD gatekeeper.</strong><br/>
Detect unused packages, calculate blast radius, prune dead code, and map your true project architecture.</p>

[![npm version](https://img.shields.io/npm/v/depmapx?color=blue&style=flat-square)](https://www.npmjs.com/package/depmapx)
[![License: CC BY-NC-ND 4.0](https://img.shields.io/badge/License-CC%20BY--NC--ND%204.0-red.svg?style=flat-square)](https://creativecommons.org/licenses/by-nc-nd/4.0/)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen?style=flat-square)](https://nodejs.org/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](https://github.com/advik/depmapx/pulls)

</div>

---

## Overview

`depmapx` is a static analysis tool that parses your codebase into an **Abstract Syntax Tree (AST)** using Babel, then cross-references every resolved import against your declared `package.json` dependencies to produce an accurate report of what is and is not actually used.

Unlike checkers that rely on regular expression heuristics, `depmapx` understands the full syntactic structure of your code, including:

- Static `import` statements
- Dynamic `import()` expressions
- CommonJS `require()` calls
- TypeScript and JSX syntax
- Scoped packages (`@scope/package`) and subpath imports

The result is a precise, verifiable picture of your project's true runtime dependencies — and exactly how much of your codebase depends on each one.

---

## Features

| Feature | Description |
|---|---|
| **Dead Dependency Detection** | Identifies packages declared in `package.json` but never imported anywhere in the codebase |
| **Blast Radius Calculation** | Traces the full cascading impact of removing a package — direct importers and every file that transitively depends on them |
| **Architecture Mapping** | Generates a Mermaid.js dependency graph grouped by source directory |
| **CI/CD Gatekeeper** | Exits with a non-zero code when unused packages are detected, enabling pipeline enforcement |
| **Zero Configuration** | No setup files or configuration required — works immediately in any Node.js project |

---

## Installation

Install globally to use across all your projects:

```bash
npm install -g depmapx
```

Or run on-demand without a global install:

```bash
npx depmapx@latest analyze
```

---

## Usage

### `analyze` — Dead Dependency Detection

Scans the current directory and produces a report of every package that is declared in `package.json` but never imported in the source code.

```bash
depmapx analyze
```

**Example output:**

```
Analysis Results:
Files Scanned:         24
Dependencies Declared: 12
Dependencies Used:     9

Unused Dependencies Detected (3):
  - lodash
  - moment
  - uuid

Recommendation: Run npm uninstall <package> to remove these dependencies.
```

The command exits with code `1` when unused dependencies are found, and code `0` when the project is clean. This makes it suitable for use as a hard gate in CI/CD pipelines.

---

### `impact` — Blast Radius Calculation

Calculates the full cascading impact of removing one or more packages from your codebase. `depmapx` does not stop at direct importers — it performs a reverse traversal of the internal file dependency graph to surface every file that would transitively break, giving you the complete blast radius before you make a destructive change.

Accepts one or more package names in a single invocation.

```bash
depmapx impact <package>
depmapx impact <package1> <package2> ...
```

**Example:**

```bash
npx depmapx impact react react-dom zustand
```

**Example output:**

```
Analysis complete for react

Blast Radius Summary:
● Total Affected Files: 38
└── 35 Direct Importers
└── 3 Indirect/Secondary Importers

Affected Files:
  - src/hooks/useAIChat.ts (Direct)
  - src/hooks/useApiData.ts (Direct)
  - src/hooks/useCountUp.ts (Direct)
  - src/hooks/useDAOData.ts (Direct)
  - src/hooks/useRealtimeEvents.ts (Direct)
  - src/hooks/useStreamingAI.ts (Direct)
  - src/app/page.tsx (Direct)
  - src/app/providers.tsx (Direct)
  - src/components/ai/AIHologram.tsx (Direct)
  - src/components/ai/CommandBar.tsx (Direct)
  - src/components/canvas/UniverseScene.tsx (Direct)
  - src/components/wallet/WalletConnect.tsx (Direct)
  - src/components/ui/Button.tsx (Direct)
  - src/components/ui/Drawer.tsx (Direct)
  - src/components/ui/Modal.tsx (Direct)
  - src/app/layout.tsx (Indirect)
  - src/components/canvas/UniverseCanvas.tsx (Indirect)
  - src/components/marketing/MarketingLayoutWrapper.tsx (Indirect)
  ...

 VERDICT  Deleting react will break 38 files.

──────────────────────────────────────────────────

i  No impact detected for react-dom. It may be unused.

──────────────────────────────────────────────────

Analysis complete for zustand

Blast Radius Summary:
● Total Affected Files: 4
└── 4 Direct Importers
└── 0 Indirect/Secondary Importers

Affected Files:
  - src/store/agentStore.ts (Direct)
  - src/store/daoStore.ts (Direct)
  - src/store/eventStore.ts (Direct)
  - src/store/uiStore.ts (Direct)

 VERDICT  Deleting zustand will break 4 files.

──────────────────────────────────────────────────
```

The blast radius distinguishes between two levels of impact. **Direct importers** are files that explicitly import the target package. **Indirect importers** are files that import those files — they carry no reference to the package themselves but their runtime behavior depends on modules that do. Both levels will break if the package is removed.

If a package is declared in `package.json` but has no detected import activity, `depmapx` reports it as potentially unused rather than silently returning an empty result.

---

### `map` — Architecture Map Generation

Produces an `ARCHITECTURE.md` file at the root of your project containing a Mermaid.js diagram. Source directories are mapped to their resolved dependencies, with used and unused packages rendered in distinct colors.

```bash
depmapx map
```

Committing `ARCHITECTURE.md` to a GitHub repository causes it to render as an interactive, navigable graph in the repository browser.

**Node color legend:**

- **Green** — Actively imported dependency
- **Red** — Declared but unused dependency
- **Blue** — Source directory node

---

## GitHub Actions Integration

`depmapx` can be used as an automated gate in a GitHub Actions workflow to block pull requests that introduce unused packages.

Create `.github/workflows/depmapx.yml` in your repository:

```yaml
name: Dependency Gatekeeper

on:
  pull_request:
    branches: [ main ]

jobs:
  analyze-dependencies:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install Dependencies
        run: npm install

      - name: Run AST Scanner
        run: npx depmapx@latest analyze
```

When unused dependencies are detected, the workflow step exits with a non-zero code, causing the check to fail and blocking the pull request from merging.

---

## How It Works

```
Source Files (.js / .ts / .jsx / .tsx)
              |
              v
       Babel AST Parser
              |
              v
      Import Node Extractor
      (static + dynamic)
              |
              +---------------------------+
              |                           |
              v                           v
   Resolve NPM package names      Map internal file-to-file
   (scoped + subpaths)            imports (local dependency graph)
              |                           |
              v                           v
   Cross-reference with          Reverse AST Traversal
     package.json                (blast radius tracing)
              |                           |
              +---------------------------+
                            |
                            v
              Unused Dependency Report
              Blast Radius Report
              Architecture Map (optional)
```

1. `depmapx` reads `package.json` from the target directory and collects all declared dependencies.
2. `fast-glob` discovers every `.js`, `.ts`, `.jsx`, and `.tsx` file, excluding `node_modules`, `dist`, `build`, and `.next`.
3. Each file is parsed by `@babel/parser` into an AST with TypeScript, JSX, and dynamic import support enabled.
4. `@babel/traverse` walks each AST and extracts two categories of imports: external NPM package references and internal relative file imports. Both are recorded separately.
5. External imports are resolved to their base package name, accounting for scoped packages and subpath imports, then cross-referenced with declared dependencies to identify unused packages.
6. Internal imports are used to construct a local file dependency graph. When `impact` is invoked, this graph is traversed in reverse — starting from files that directly import the target package, then recursively identifying every file that imports those files — to produce the complete blast radius.

---

## Requirements

- **Node.js** >= 18.0.0
- A `package.json` present in the directory being scanned

---

## Ignored Directories

The following directories are excluded from file discovery automatically:

- `node_modules/`
- `dist/`
- `build/`
- `.next/`

No configuration file is required to control this behavior.

---

## FAQ

**Does it support TypeScript?**
Yes. The Babel parser runs with the TypeScript plugin enabled. Both `.ts` and `.tsx` files are fully parsed and analyzed.

**Does it support monorepos?**
`depmapx` analyzes one package at a time. To use it in a monorepo, run it from within a specific workspace package directory. Workspace-level orchestration is planned for a future release.

**Will it automatically remove unused packages?**
No. `depmapx` is a read-only analysis tool. It reports findings but does not modify your project. To remove an unused package, run:

```bash
npm uninstall <package-name>
```

**How does blast radius differ from just searching for imports?**
A plain import search only finds files that directly reference the package. The blast radius engine goes further — it maps every internal `import` between your own source files and traverses that graph in reverse. Files that have no direct knowledge of the package but depend on modules that do are also surfaced. In a layered codebase, this secondary impact is typically larger than the direct impact.

**Why use this instead of `depcheck`?**
`depcheck` relies on regular expression pattern matching, which can produce false positives and miss dynamic import patterns. `depmapx` operates on the AST — the same representation compilers use — making it structurally aware of every import form your code can express.

---

## Contributing

Bug reports, feature requests, and pull requests are welcome. To contribute:

1. Fork the repository.
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Commit your changes following conventional commits: `git commit -m 'feat: describe your change'`
4. Push to the branch: `git push origin feat/your-feature`
5. Open a pull request against `main`.

Please open an issue before beginning work on significant changes so the approach can be discussed in advance.

---

## Changelog

### v1.2.0
- Added `impact` command with full blast radius calculation
- Reverse AST traversal engine to trace indirect file-to-file dependencies
- Multi-package support — analyze several packages in a single invocation
- Internal local dependency graph now constructed during every scan
- Graceful handling of unused packages within an `impact` run — reports instead of errors

### v1.1.3
- Added `map` command with Mermaid.js architecture output
- Improved scoped package and subpath resolution
- Excluded `.next/` directory from file discovery

### v1.0.0
- Initial release with `analyze` command
- AST-based unused dependency detection via Babel

---

## License

Copyright (c) 2024 Advik. All rights reserved.

This project is licensed under the **Creative Commons Attribution-NonCommercial-NoDerivatives 4.0 International License (CC BY-NC-ND 4.0)**.

You are permitted to share — copy and redistribute this material in any medium or format — strictly under the following conditions:

- **Attribution** — Appropriate credit must be given to the original author (Advik), with an indication if changes were made. Credit must not suggest endorsement by the author.
- **NonCommercial** — This material may not be used for commercial purposes in any form.
- **NoDerivatives** — If you remix, transform, or build upon this material, you may not distribute the modified version under any circumstances.

No additional restrictions may be applied beyond those stated above. The intellectual property, brand, and authorship of this project remain solely with the original author. Redistribution under a different name, repackaging as a commercial product, or publishing derivative works as original contributions is strictly prohibited under this license.

Full license text: [https://creativecommons.org/licenses/by-nc-nd/4.0/](https://creativecommons.org/licenses/by-nc-nd/4.0/)

---

<div align="center">

Authored by <a href="https://github.com/advikdivekar">Advik</a>

</div>
