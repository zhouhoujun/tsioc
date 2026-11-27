import expect = require('expect');
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { Suite, Test } from '@tsdi/unit';

const ROOT = join(__dirname, '..');
const SKIP = new Set(['test', 'dist', 'lib', 'node_modules', 'docs', 'bench', 'scripts', 'catalog']);
const TOKEN_FILES = new Set(['src/theme-tokens.ts', 'src/design-tokens.ts']);
const COLOR = /#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(/g;

/** Token fallbacks (`var(--ui-border, #cbd5e1)`) are allowed; count only bare colors. */
function countColors(source: string): number {
    let stripped = source;
    let previous = '';
    while (stripped !== previous) {
        previous = stripped;
        stripped = stripped.replace(/var\([^()]*\)/g, '');
    }
    return (stripped.match(COLOR) || []).length;
}

function sourceFiles(dir: string, files: string[] = []): string[] {
    for (const entry of readdirSync(dir)) {
        if (SKIP.has(entry)) {
            continue;
        }
        const path = join(dir, entry);
        if (statSync(path).isDirectory()) {
            sourceFiles(path, files);
        } else if (entry.endsWith('.ts')) {
            files.push(path);
        }
    }
    return files;
}

@Suite('common token color gate')
export class TokenColorGateTest {
    @Test('component skins do not add hardcoded colors beyond the ratchet baseline')
    colorsRatchet() {
        const baseline = JSON.parse(readFileSync(join(__dirname, '..', 'scripts', 'color-baseline.json'), 'utf8')) as {
            total: number;
            files: Record<string, number>;
        };
        const violations: string[] = [];
        let total = 0;

        for (const file of sourceFiles(ROOT)) {
            const relative = file.slice(ROOT.length + 1).replace(/\\/g, '/');
            if (TOKEN_FILES.has(relative)) {
                continue;
            }
            const count = countColors(readFileSync(file, 'utf8'));
            if (!count) {
                continue;
            }
            total += count;
            const allowed = baseline.files[relative] ?? 0;
            if (count > allowed) {
                violations.push(`${relative}: ${count} hardcoded colors > allowed ${allowed}`);
            }
        }

        if (total > baseline.total) {
            violations.push(`total hardcoded colors: ${total} > allowed ${baseline.total}`);
        }
        expect(violations).toEqual([]);
    }
}
