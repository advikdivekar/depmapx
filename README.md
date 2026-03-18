<div align="center">

<h1>depmapx</h1>

<p><strong>AST-driven dependency analyzer and CI/CD gatekeeper.</strong><br/>
Detect unused packages, prune dead code, and map your true project architecture.</p>

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

The result is a precise, verifiable picture of your project's true runtime dependencies.

---

## Features

| Feature | Description |
|---|---|
| **Dead Dependency Detection** | Identifies packages declared in `package.json` but never imported anywhere in the codebase |
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
              v
   Resolve base package names
   (handle scoped + subpaths)
              |
              v
   Cross-reference with package.json
              |
              v
   Unused Dependency Report
   + Architecture Map (optional)
```

1. `depmapx` reads `package.json` from the target directory and collects all declared dependencies.
2. `fast-glob` discovers every `.js`, `.ts`, `.jsx`, and `.tsx` file, excluding `node_modules`, `dist`, and `build`.
3. Each file is parsed by `@babel/parser` into an AST with TypeScript, JSX, and dynamic import support enabled.
4. `@babel/traverse` walks each AST and extracts import sources from `ImportDeclaration`, `CallExpression` (require), and dynamic `import()` nodes.
5. Raw import strings are resolved to their base package name, accounting for scoped packages and subpath imports.
6. The resolved set of used packages is compared against the declared dependency list to produce the final report.

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
