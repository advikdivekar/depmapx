import { scanProject } from './scanner.js';

/*
 * Calculates the cascading impact of removing a specific NPM package.
 * Traces through both direct package imports and internal file-to-file dependencies.
 */
export async function calculateBlastRadius(targetDir, packageName) {
    const results = await scanProject(targetDir);
    const { fileToDeps, fileToLocals } = results;

    // Step 1: Identify Level 1 impact (files directly importing the package)
    const directAffected = new Set(
        Object.keys(fileToDeps).filter(file => fileToDeps[file].includes(packageName))
    );

    if (directAffected.size === 0) {
        return { packageName, total: 0, directCount: 0, indirectCount: 0, affectedFiles: [] };
    }

    // Step 2: Trace indirect impact (files importing affected local files)
    const fullBlastRadius = new Set(directAffected);
    let discoveryMade = true;

    while (discoveryMade) {
        discoveryMade = false;
        const currentSize = fullBlastRadius.size;

        for (const [file, localImports] of Object.entries(fileToLocals)) {
            if (fullBlastRadius.has(file)) continue;

            // Check if this file imports any file already in the blast radius
            const importsAffectedFile = localImports.some(impPath => {
                // Normalize path to match keys in fileToLocals
                const normalizedImp = impPath.replace(/^\.+[\/\\]/, '');
                return Array.from(fullBlastRadius).some(affected => affected.includes(normalizedImp));
            });

            if (importsAffectedFile) {
                fullBlastRadius.add(file);
                discoveryMade = true;
            }
        }
    }

    return {
        packageName,
        directCount: directAffected.size,
        indirectCount: fullBlastRadius.size - directAffected.size,
        total: fullBlastRadius.size,
        affectedFiles: Array.from(fullBlastRadius)
    };
}