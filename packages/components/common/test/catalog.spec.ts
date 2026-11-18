import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { UI_CSS } from '../src/ui.styles';

const ROOT = join(__dirname, '..');
const README = readFileSync(join(ROOT, 'README.md'), 'utf8');
const SKIP = new Set(['src', 'test', 'dist', 'lib', 'node_modules']);

function widgetNames(): string[] {
    return readdirSync(ROOT, { withFileTypes: true })
        .filter(entry => entry.isDirectory() && !SKIP.has(entry.name))
        .map(entry => entry.name)
        .filter(name => existsSync(join(ROOT, name, 'index.ts')) && existsSync(join(ROOT, name, 'src/module.ts')))
        .sort();
}

const BASE_SELECTORS = [
    'ui-button', 'ui-badge', 'ui-card', 'ui-empty', 'ui-divider', 'ui-stat',
    'ui-progress', 'ui-breadcrumb', 'ui-toolbar', 'ui-steps', 'ui-timeline',
    'ui-skeleton', 'ui-search-field', 'ui-avatar', 'ui-pagination',
    'ui-data-table', 'ui-tree', 'ui-text-field', 'ui-checkbox', 'ui-switch',
    'ui-radio-group', 'ui-alert', 'ui-select-trigger', 'ui-kbd'
];

@Suite('common package catalog')
export class CommonCatalogTest {
    @Test('every widget entry has a module, barrel and README catalogue row')
    widgetEntries() {
        const missing: string[] = [];
        for (const name of widgetNames()) {
            for (const file of ['src/index.ts', 'src/module.ts']) {
                if (!existsSync(join(ROOT, name, file))) {
                    missing.push(`${name}/${file}`);
                }
            }
            if (!README.includes(`\`${name}\``)) {
                missing.push(`${name} (README entry)`);
            }
        }
        expect(missing).toEqual([]);
    }

    @Test('widget modules and barrels follow the naming convention')
    moduleNaming() {
        const violations: string[] = [];
        for (const name of widgetNames()) {
            const moduleSource = readFileSync(join(ROOT, name, 'src/module.ts'), 'utf8');
            const barrel = readFileSync(join(ROOT, name, 'src/index.ts'), 'utf8');
            if (!/export\s+class\s+\w+Module\b/.test(moduleSource)) {
                violations.push(`${name}/module.ts has no Module export`);
            }
            if (!barrel.includes("export * from './module';")) {
                violations.push(`${name}/index.ts does not export the module`);
            }
        }
        expect(violations).toEqual([]);
    }

    @Test('every widget exposes a ui- selector alias')
    uiSelectorAliases() {
        const missing: string[] = [];
        for (const name of widgetNames()) {
            const srcDir = join(ROOT, name, 'src');
            const files = readdirSync(srcDir, { withFileTypes: true })
                .filter(entry => entry.isFile() && entry.name.endsWith('.ts'))
                .map(entry => join(srcDir, entry.name));
            const selectors: string[] = [];
            for (const file of files) {
                const source = readFileSync(file, 'utf8');
                for (const match of source.matchAll(/selector\s*:\s*['"`]([^'"`]+)['"`]/g)) {
                    selectors.push(match[1]);
                }
            }
            for (const selector of selectors) {
                if (!selector.split(',').some(part => part.trim().startsWith('ui-'))) {
                    missing.push(`${name}: ${selector}`);
                }
            }
        }
        expect(missing).toEqual([]);
    }

    @Test('the shared UI skin covers every base primitive')
    uiSkinCoverage() {
        const missing = BASE_SELECTORS.filter(selector => !UI_CSS.includes(`.${selector}`));
        expect(missing).toEqual([]);
    }
}
