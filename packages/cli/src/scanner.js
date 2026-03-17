import fg from 'fast-glob';
import fs from 'fs';
import path from 'path';
import { extractDependencies } from './ast-parser.js';

export async function scanProject(targetDir) {
    const packageJsonPath = path.join(targetDir, 'package.json');

    if (!fs.existsSync(packageJsonPath)) {
        throw new Error('No package.json found in the target directory.');
    }

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    const declaredDeps = Object.keys(packageJson.dependencies || {});

    // Find all JS/TS files, ignoring node_modules and build folders
    const files = await fg(['**/*.{js,jsx,ts,tsx}'], {
        cwd: targetDir,
        ignore: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/coverage/**'],
        absolute: true,
    });

    const usedDeps = new Set();

    for (const file of files) {
        const imports = extractDependencies(file);
        // Clean up internal paths (e.g., 'lodash/get' -> 'lodash')
        imports.forEach(imp => {
            const basePackage = imp.startsWith('@')
                ? imp.split('/').slice(0, 2).join('/')
                : imp.split('/')[0];
            usedDeps.add(basePackage);
        });
    }

    // Calculate unused
    const unusedDeps = declaredDeps.filter(dep => !usedDeps.has(dep));

    return {
        scannedFiles: files.length,
        declaredCount: declaredDeps.length,
        usedCount: declaredDeps.length - unusedDeps.length,
        unusedDeps,
    };
}