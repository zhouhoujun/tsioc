import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { collectWidgetCatalog, renderWidgetCatalogMarkdown } from '../catalog';

const ROOT = join(__dirname, '..');
const nodeFs = {
    listDirectories: (root: string): string[] => readdirSync(root, { withFileTypes: true })
        .filter(entry => entry.isDirectory())
        .map(entry => entry.name),
    listFiles: (root: string): string[] => readdirSync(root, { withFileTypes: true })
        .filter(entry => entry.isFile())
        .map(entry => entry.name),
    exists: (path: string): boolean => existsSync(path),
    readText: (path: string): string => readFileSync(path, 'utf8')
};

@Suite('common widget catalog metadata')
export class CommonCatalogMetadataTest {
    @Test('every widget entry gets a catalog entry with selector and summary')
    everyWidget() {
        const entries = collectWidgetCatalog(nodeFs as any, ROOT);
        expect(entries.length).toBeGreaterThan(55);
        for (const entry of entries) {
            expect(entry.selector.startsWith('ui-')).toEqual(true);
            expect(entry.summary.trim().length).toBeGreaterThan(0);
        }
        expect(entries.map(entry => entry.name)).toEqual([...entries.map(entry => entry.name)].sort());
    }

    @Test('attribute metadata is generated for the core widgets')
    attributes() {
        const entries = collectWidgetCatalog(nodeFs as any, ROOT);
        const byName = new Map(entries.map(entry => [entry.name, entry]));
        expect(byName.get('dialog')?.attributes.some(attribute => attribute.name === 'title')).toEqual(true);
        expect(byName.get('select')?.attributes.some(attribute => attribute.name === 'options')).toEqual(true);
        expect(byName.get('data-table')?.attributes.some(attribute => attribute.name === 'columns')).toEqual(true);
        const total = entries.reduce((sum, entry) => sum + entry.attributes.length, 0);
        expect(total).toBeGreaterThan(150);
        for (const entry of entries) {
            const names = entry.attributes.map(attribute => attribute.name);
            expect(new Set(names).size).toEqual(names.length);
        }
    }

    @Test('core widget quality metadata includes keyboard and examples')
    qualityMetadata() {
        const entries = collectWidgetCatalog(nodeFs as any, ROOT);
        for (const name of ['dialog', 'select', 'data-table', 'dynamic-form']) {
            const entry = entries.find(item => item.name === name);
            expect(entry?.keyboard?.length).toBeGreaterThan(2);
            expect(entry?.examples?.length).toBeGreaterThan(0);
        }
    }

    @Test('markdown rendering includes names, attributes and keyboard contracts')
    markdown() {
        const markdown = renderWidgetCatalogMarkdown(collectWidgetCatalog(nodeFs as any, ROOT));
        expect(markdown).toContain('## dialog');
        expect(markdown).toContain('| attribute | type | default |');
        expect(markdown).toContain('Keyboard:');
        expect(markdown).toContain('## data-table');
    }
}
