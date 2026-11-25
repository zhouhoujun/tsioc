import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..');
const SKIP = new Set(['test', 'dist', 'lib', 'node_modules', 'docs', 'bench', 'scripts']);
const BUILD_FILES = new Set(['taskfile.ts', 'unit.ts']);

/** Every TypeScript source that ships in the package (tests excluded). */
function sourceFiles(dir: string, files: string[] = []): string[] {
    for (const entry of readdirSync(dir)) {
        if (SKIP.has(entry)) {
            continue;
        }
        const path = join(dir, entry);
        if (statSync(path).isDirectory()) {
            sourceFiles(path, files);
        } else if (entry.endsWith('.ts') && !BUILD_FILES.has(entry)) {
            files.push(path);
        }
    }
    return files;
}

const FORBIDDEN: Array<{ pattern: RegExp; reason: string }> = [
    { pattern: /from\s+['"]@tsdi\/components\/html['"]/, reason: 'common must stay renderer-neutral (html)' },
    { pattern: /from\s+['"]@tsdi\/components\/console['"]/, reason: 'common must stay renderer-neutral (console)' },
    { pattern: /from\s+['"]@tsdi\/agent-ui/, reason: 'common must not depend on agent-ui' },
    { pattern: /from\s+['"](?:node:|fs['"]|path['"]|os['"]|child_process['"])/, reason: 'common must not use node builtins' },
    { pattern: /\brequire\(\s*['"](?:node:|fs|path|os|child_process)/, reason: 'common must not require node builtins' },
    { pattern: /\bnew\s+Buffer\b|\bBuffer\.from\b/, reason: 'common must not use Buffer' },
    { pattern: /\bprocess\.(?:env|argv|platform|cwd)\b/, reason: 'common must guard environment access via globalThis' }
];

@Suite('common import boundaries')
export class ImportBoundariesTest {
    @Test('renderer-neutral sources do not import platform/node dependencies')
    rendererNeutral() {
        const violations: string[] = [];
        for (const file of sourceFiles(ROOT)) {
            const source = readFileSync(file, 'utf8');
            for (const rule of FORBIDDEN) {
                if (rule.pattern.test(source)) {
                    violations.push(`${file.slice(ROOT.length + 1)}: ${rule.reason}`);
                }
            }
        }
        expect(violations).toEqual([]);
    }

    @Test('widget barrels never re-export html/console renderers')
    widgetBarrels() {
        const violations: string[] = [];
        for (const entry of readdirSync(ROOT)) {
            if (SKIP.has(entry) || entry === 'src' || entry === 'catalog') {
                continue;
            }
            const path = join(ROOT, entry);
            if (!statSync(path).isDirectory()) {
                continue;
            }
            const barrel = join(path, 'src', 'index.ts');
            try {
                const source = readFileSync(barrel, 'utf8');
                if (source.includes('@tsdi/components/html') || source.includes('@tsdi/components/console')) {
                    violations.push(`${entry}/src/index.ts`);
                }
            } catch {
                // Directories without a barrel are handled by catalog.spec.
            }
        }
        expect(violations).toEqual([]);
    }
}
