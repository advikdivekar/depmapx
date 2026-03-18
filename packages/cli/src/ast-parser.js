import fs from 'fs';
import { parse } from '@babel/parser';
import traverseModule from '@babel/traverse';

// Babel's ESM compatibility fix
const traverse = traverseModule.default || traverseModule;

export function parseFile(filePath) {
    try {
        const code = fs.readFileSync(filePath, 'utf-8');

        // Parse the code into an Abstract Syntax Tree
        const ast = parse(code, {
            sourceType: 'module',
            plugins: ['jsx', 'typescript', 'dynamicImport', 'classProperties']
        });

        const imports = [];

        // Walk through the tree to find where packages are used
        traverse(ast, {
            ImportDeclaration({ node }) {
                if (node.source && node.source.value) {
                    imports.push(node.source.value);
                }
            },
            CallExpression({ node }) {
                if (node.callee.name === 'require' && node.arguments.length > 0) {
                    if (node.arguments[0].type === 'StringLiteral') {
                        imports.push(node.arguments[0].value);
                    }
                }
                if (node.callee.type === 'Import' && node.arguments.length > 0) {
                    if (node.arguments[0].type === 'StringLiteral') {
                        imports.push(node.arguments[0].value);
                    }
                }
            }
        });

        // We only care about NPM packages, not relative local files (like './components')
        return imports.filter(imp => !imp.startsWith('.'));

    } catch (error) {
        return [];
    }
}