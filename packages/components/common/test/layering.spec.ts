import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = join(__dirname, '..');
const SKIP = new Set(['test', 'dist', 'lib', 'node_modules']);

function sourceFiles(dir: string, out: string[] = []): string[] {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (SKIP.has(entry.name)) {
            continue;
        }
        const full = join(dir, entry.name);
        if (entry.isDirectory()) {
            sourceFiles(full, out);
        } else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) {
            out.push(full);
        }
    }
    return out;
}

function packageSourceFiles(): string[] {
    return sourceFiles(ROOT).filter(file => relative(ROOT, file).split(/[\\/]/).includes('src'));
}

const IMPORT = /(?:from\s+|import\s*\()\s*['"]([^'"]+)['"]/g;

@Suite('common package layering')
export class CommonLayeringTest {
    @Test('only depends on components core, forms and ioc')
    allowedDependencies() {
        const forbidden = [
            '@tsdi/core',
            '@tsdi/components/html',
            '@tsdi/components/console',
            '@tsdi/components/xml',
            '@tsdi/components/json',
            '@tsdi/components/router'
        ];
        const violations: string[] = [];
        for (const file of packageSourceFiles()) {
            const source = readFileSync(file, 'utf8');
            for (const match of source.matchAll(IMPORT)) {
                const specifier = match[1];
                if (forbidden.some(prefix => specifier === prefix || specifier.startsWith(`${prefix}/`))) {
                    violations.push(`${relative(ROOT, file)} -> ${specifier}`);
                }
            }
        }
        expect(violations).toEqual([]);
    }

    @Test('does not import node builtins or process globals')
    rendererNeutralRuntime() {
        const violations: string[] = [];
        for (const file of packageSourceFiles()) {
            const source = readFileSync(file, 'utf8');
            for (const match of source.matchAll(IMPORT)) {
                if (match[1].startsWith('node:') || ['fs', 'path', 'os', 'process', 'buffer', 'child_process'].includes(match[1])) {
                    violations.push(`${relative(ROOT, file)} -> ${match[1]}`);
                }
            }
            if (/\bprocess\.(env|argv|stdout|stderr|platform|cwd)\b/.test(source)
                || /\bBuffer\./.test(source)
                || /\b__dirname\b/.test(source)) {
                violations.push(`${relative(ROOT, file)} -> node global`);
            }
        }
        expect(violations).toEqual([]);
    }
}
