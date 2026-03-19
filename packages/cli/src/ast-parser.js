import fs from 'fs';
import { parse } from '@babel/parser';
import traverseModule from '@babel/traverse';

// Babel's ESM compatibility fix
const traverse = traverseModule.default || traverseModule;

export function parseFile(filePath) {
    try {
        const code = fs.readFileSync(filePath, 'utf-8');

        // The Brain: Parsing code into an Abstract Syntax Tree
        const ast = parse(code, {
            sourceType: 'module',
            plugins: ['jsx', 'typescript', 'dynamicImport', 'classProperties']
        });

        const packages = [];
        const locals = [];

        traverse(ast, {
            // Standard imports: import x from 'y'
            ImportDeclaration({ node }) {
                if (node.source && node.source.value) {
                    const val = node.source.value;
                    // Check if it's a local file (./ or ../) or an NPM package
                    val.startsWith('.') ? locals.push(val) : packages.push(val);
                }
            },
            // Dynamic imports or require: require('y') or import('y')
            CallExpression({ node }) {
                const isRequire = node.callee.name === 'require';
                const isDynamicImport = node.callee.type === 'Import';

                if ((isRequire || isDynamicImport) && node.arguments.length > 0) {
                    if (node.arguments[0].type === 'StringLiteral') {
                        const val = node.arguments[0].value;
                        val.startsWith('.') ? locals.push(val) : packages.push(val);
                    }
                }
            }
        });

        // Return a structured object instead of a simple list
        return {
            packages: [...new Set(packages)],
            locals: [...new Set(locals)]
        };

    } catch (error) {
        // If a file is broken, return empty arrays so the CLI doesn't crash
        return { packages: [], locals: [] };
    }
}