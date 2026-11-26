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
        const componentAt = source.indexOf('@Component');
        if (componentAt < 0) {
            continue;
        }
        // Use the last JSDoc block before @Component: files often document
        // interfaces/helpers above the component itself.
        const blocks = [...source.slice(0, componentAt).matchAll(/\/\*\*([\s\S]*?)\*\//g)];
        const block = blocks[blocks.length - 1];
        if (!block) {
            continue;
        }
        const line = block[1]
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
    const fieldPattern = /@Attribute\(\)\s*(?:readonly\s+)?([A-Za-z_$][\w$]*)\s*[!?]?\s*([^;\n]*);/g;
    // Accessor inputs (`@Attribute() get modal(): boolean`) are common for
    // normalized booleans; include them in the generated property table.
    const accessorPattern = /@Attribute\(\)\s*(?:get\s+)?([A-Za-z_$][\w$]*)\s*\(\s*\)\s*:\s*([^\{\n]+)/g;
    for (const source of sources) {
        const set = (name: string, type?: string, fallback?: string) => {
            attributes.set(name, {
                name,
                ...(type ? { type: type.trim() } : {}),
                ...(fallback !== undefined ? { default: fallback.trim() } : {})
            });
        };
        for (const match of source.matchAll(fieldPattern)) {
            const name = match[1];
            const rest = String(match[2] || '').trim();
            if (!rest) {
                set(name);
                continue;
            }
            if (!rest.startsWith(':')) {
                if (rest.startsWith('=')) {
                    set(name, undefined, rest.slice(1).trim());
                }
                continue;
            }
            const body = rest.slice(1).trim();
            const arrow = body.indexOf('=>');
            const assign = body.lastIndexOf('=');
            if (arrow >= 0 && assign > arrow) {
                set(name, body.slice(0, assign).trim(), body.slice(assign + 1).trim());
            } else if (arrow < 0 && assign >= 0) {
                set(name, body.slice(0, assign).trim(), body.slice(assign + 1).trim());
            } else {
                set(name, body);
            }
        }
        for (const match of source.matchAll(accessorPattern)) {
            set(match[1], match[2]?.trim());
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
                const cell = (value: any) => String(value ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
                lines.push(`| ${cell(attribute.name)} | ${cell(attribute.type)} | ${cell(attribute.default)} |`);
            }
            lines.push('');
        }
        if (entry.keyboard?.length) {
            lines.push('Keyboard:', '', ...entry.keyboard.map(item => `- ${item}`), '');
        }
    }
    return lines.join('\n');
}
