import type { CatalogAttribute, CatalogFileSystem, WidgetCatalogEntry } from './types';
import { CATALOG_OVERRIDES } from './overrides';

const SKIP = new Set(['src', 'test', 'dist', 'lib', 'node_modules', 'docs', 'catalog']);

function sourceFiles(fs: CatalogFileSystem, root: string, name: string): string[] {
    const srcDir = `${root}/${name}/src`;
    if (!fs.exists(srcDir)) {
        return [];
    }
    return fs.listFiles(srcDir)
        .filter(file => file.endsWith('.ts'))
        .map(file => `${srcDir}/${file}`);
}

function pickSelector(sources: string[]): string {
    const selectors: string[] = [];
    for (const source of sources) {
        for (const match of source.matchAll(/selector\s*:\s*['"`]([^'"`]+)['"`]/g)) {
            selectors.push(...match[1].split(',').map(part => part.trim()));
        }
    }
    return selectors.find(selector => selector.startsWith('ui-')) ?? selectors[0] ?? '';
}

function pickSummary(sources: string[], name: string): string {
    for (const source of sources) {
        const match = /\/\*\*([\s\S]*?)\*\/\s*@Component/.exec(source);
        if (!match) {
            continue;
        }
        const line = match[1]
            .split('\n')
            .map(item => item.replace(/^\s*\*?\s?/, '').trim())
            .find(Boolean);
        if (line) {
            return line;
        }
    }
    return `${name} component`;
}

function collectAttributes(sources: string[]): CatalogAttribute[] {
    const attributes = new Map<string, CatalogAttribute>();
    const pattern = /@Attribute\(\)\s*(?:readonly\s+)?([A-Za-z_$][\w$]*)\s*[!?]?(?::\s*([^=;\n]+))?\s*(?:=\s*([^;\n]+))?;/g;
    for (const source of sources) {
        for (const match of source.matchAll(pattern)) {
            const name = match[1];
            const type = match[2]?.trim();
            const fallback = match[3]?.trim();
            attributes.set(name, {
                name,
                ...(type ? { type } : {}),
                ...(fallback !== undefined ? { default: fallback } : {})
            });
        }
    }
    return Array.from(attributes.values()).sort((left, right) => left.name.localeCompare(right.name));
}

/** Collect catalog entries for every `common/<widget>` directory. */
export function collectWidgetCatalog(fs: CatalogFileSystem, root: string): WidgetCatalogEntry[] {
    return fs.listDirectories(root)
        .filter(name => !SKIP.has(name))
        .filter(name => fs.exists(`${root}/${name}/index.ts`) && fs.exists(`${root}/${name}/src/module.ts`))
        .sort()
        .map(name => {
            const sources = sourceFiles(fs, root, name).map(path => fs.readText(path));
            const override = CATALOG_OVERRIDES[name] ?? {};
            const generated = collectAttributes(sources);
            const merged = new Map(generated.map(attribute => [attribute.name, attribute]));
            for (const attribute of override.attributes ?? []) {
                merged.set(attribute.name, attribute);
            }
            return {
                name,
                selector: pickSelector(sources),
                summary: override.summary ?? pickSummary(sources, name),
                attributes: Array.from(merged.values()).sort((left, right) => left.name.localeCompare(right.name)),
                ...(override.keyboard ? { keyboard: override.keyboard } : {}),
                ...(override.surfaces ? { surfaces: override.surfaces } : {}),
                ...(override.examples ? { examples: override.examples } : {})
            };
        });
}

/** Stable markdown rendering used by docs/catalog pages. */
export function renderWidgetCatalogMarkdown(entries: WidgetCatalogEntry[]): string {
    const lines: string[] = ['# @tsdi/components/common catalog', ''];
    for (const entry of entries) {
        lines.push(`## ${entry.name}`, '', `- selector: \`${entry.selector || entry.name}\``, `- ${entry.summary}`, '');
        if (entry.attributes.length) {
            lines.push('| attribute | type | default |', '| --- | --- | --- |');
            for (const attribute of entry.attributes) {
                lines.push(`| ${attribute.name} | ${attribute.type ?? ''} | ${attribute.default ?? ''} |`);
            }
            lines.push('');
        }
        if (entry.keyboard?.length) {
            lines.push('Keyboard:', '', ...entry.keyboard.map(item => `- ${item}`), '');
        }
    }
    return lines.join('\n');
}
