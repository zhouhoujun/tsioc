import type { WidgetCatalogEntry } from './types';

function escapeHtml(value: any): string {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function slug(value: string): string {
    return String(value || 'widget').replace(/[^a-z0-9_-]+/gi, '-').toLowerCase();
}

const PAGE_CSS = `
:root { color-scheme: light dark; --bg: #ffffff; --fg: #1f2328; --muted: #57606a; --panel: #f6f8fa; --border: #d0d7de; --accent: #0969da; }
@media (prefers-color-scheme: dark) {
  :root { --bg: #0d1117; --fg: #e6edf3; --muted: #9da7b3; --panel: #161b22; --border: #30363d; --accent: #4493f8; }
}
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--fg); font: 14px/1.55 ui-sans-serif, system-ui, sans-serif; }
header { padding: 1.2rem 1.4rem; border-bottom: 1px solid var(--border); }
header h1 { margin: 0 0 .25rem; font-size: 1.35rem; }
header p { margin: 0; color: var(--muted); }
.layout { display: grid; grid-template-columns: minmax(12rem, 18rem) 1fr; min-height: calc(100vh - 6rem); }
nav { border-right: 1px solid var(--border); padding: 1rem; position: sticky; top: 0; align-self: start; max-height: 100vh; overflow: auto; }
nav a { display: block; padding: .2rem .35rem; color: var(--fg); text-decoration: none; border-radius: .25rem; }
nav a:hover { background: var(--panel); }
main { padding: 1rem 1.6rem 4rem; min-width: 0; }
section { padding: 1rem 0 1.4rem; border-bottom: 1px solid var(--border); }
h2 { margin: 0 0 .3rem; font-size: 1.1rem; }
code { color: var(--accent); }
table { border-collapse: collapse; width: 100%; margin: .6rem 0; }
th, td { text-align: left; padding: .25rem .5rem; border-bottom: 1px solid var(--border); vertical-align: top; }
th { color: var(--muted); font-weight: 600; }
pre { margin: .4rem 0; padding: .6rem .8rem; background: var(--panel); border: 1px solid var(--border); overflow: auto; }
ul { margin: .3rem 0; padding-left: 1.2rem; }
.muted { color: var(--muted); }
@media (max-width: 800px) { .layout { display: block; } nav { position: static; max-height: none; border-right: 0; border-bottom: 1px solid var(--border); } }
`;

/** Static HTML catalog so widget metadata can be inspected without a bundler. */
export function renderCatalogHtml(entries: WidgetCatalogEntry[]): string {
    const sorted = [...entries].sort((left, right) => left.name.localeCompare(right.name));
    const nav = sorted.map(entry => `<a href="#widget-${escapeHtml(slug(entry.name))}">${escapeHtml(entry.name)}</a>`).join('\n');
    const sections = sorted.map(entry => {
        const attributes = entry.attributes.length
            ? `<table><thead><tr><th>attribute</th><th>type</th><th>default</th></tr></thead><tbody>${entry.attributes.map(attribute => `<tr><td><code>${escapeHtml(attribute.name)}</code></td><td>${escapeHtml(attribute.type ?? '')}</td><td>${escapeHtml(attribute.default ?? '')}</td></tr>`).join('')}</tbody></table>`
            : '<p class="muted">No attributes.</p>';
        const keyboard = entry.keyboard?.length
            ? `<h3>Keyboard</h3><ul>${entry.keyboard.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`
            : '';
        const surfaces = entry.surfaces
            ? `<h3>Surfaces</h3><ul>${entry.surfaces.html ? `<li><strong>html</strong>: ${escapeHtml(entry.surfaces.html)}</li>` : ''}${entry.surfaces.console ? `<li><strong>console</strong>: ${escapeHtml(entry.surfaces.console)}</li>` : ''}</ul>`
            : '';
        const examples = entry.examples?.length
            ? `<h3>Examples</h3>${entry.examples.map(example => `<h4>${escapeHtml(example.title)}</h4>${example.description ? `<p>${escapeHtml(example.description)}</p>` : ''}<pre>${escapeHtml(JSON.stringify(example.props ?? {}, null, 2))}</pre>`).join('')}`
            : '';
        return `<section id="widget-${escapeHtml(slug(entry.name))}">
<h2>${escapeHtml(entry.name)} <span class="muted">${escapeHtml(entry.selector || '')}</span></h2>
<p>${escapeHtml(entry.summary)}</p>
${attributes}
${keyboard}
${surfaces}
${examples}
</section>`;
    }).join('\n');
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>@tsdi/components/common catalog</title>
<style>${PAGE_CSS}</style>
</head>
<body>
<header>
<h1>@tsdi/components/common catalog</h1>
<p>${sorted.length} renderer-neutral widgets · generated from catalog metadata</p>
</header>
<div class="layout">
<nav>
${nav}
</nav>
<main>
${sections}
</main>
</div>
</body>
</html>`;
}
