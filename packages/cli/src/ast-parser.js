import fs from 'fs';
import { parse } from '@babel/parser';
import _traverse from '@babel/traverse';

// Handle Babel's ES module default export quirk
const traverse = _traverse.default || _traverse;

export function extractDependencies(filePath) {
    const code = fs.readFileSync(filePath, 'utf-8');
    const dependencies = new Set();

    try {
        const ast = parse(code, {
            sourceType: 'module',
            plugins: ['jsx', 'typescript'],
        });

        traverse(ast, {
            // Catches: import x from 'package'
            ImportDeclaration({ node }) {
                if (node.source && node.source.value) {
                    dependencies.add(node.source.value);
                }
            },
            // Catches: const x = require('package') and import('package')
            CallExpression({ node }) {
                if (
                    (node.callee.name === 'require' || node.callee.type === 'Import') &&
                    node.arguments.length > 0 &&
                    node.arguments[0].type === 'StringLiteral'
                ) {
                    dependencies.add(node.arguments[0].value);
                }
            },
        });
    } catch (error) {
        // Silently ignore unparseable files (like minified dist files) to keep CLI fast
    }

    return Array.from(dependencies);
}