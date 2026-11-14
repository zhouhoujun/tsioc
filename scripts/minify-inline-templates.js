/**
 * Build-time minifier for inline component templates and stylesheet strings.
 *
 * esbuild minifies JavaScript but keeps the *contents* of string/template
 * literals untouched, so AOT output still carries indented HTML templates and
 * the full `WORKFLOW_DESIGNER_CSS` stylesheet. This pass parses the emitted ESM
 * with acorn and rewrites only safe literals:
 *
 *  - `template: \`...\`` properties  → HTML minified (interpolations protected);
 *  - `*_CSS` / `style(s)` constants  → CSS minified with esbuild.
 *
 * Templates with `${...}` expressions are skipped (their runtime text cannot be
 * minified statically).
 */
const acorn = require('acorn');
const esbuild = require('esbuild');
const { minify: minifyHtmlDocument } = require('html-minifier-terser');

function minifyCssText(css) {
    if (!css || css.length < 120) {
        return css;
    }
    try {
        return esbuild.transformSync(css, { loader: 'css', minify: true }).code;
    } catch {
        return css;
    }
}

async function minifyHtmlText(html) {
    if (!html || html.length < 120) {
        return html;
    }
    try {
        return await minifyHtmlDocument(html, {
            caseSensitive: true,
            collapseWhitespace: true,
            conservativeCollapse: true,
            removeComments: true,
            keepClosingSlash: true,
            // Framework bindings/directives are data inside attributes and text;
            // never let the minifier touch interpolation expressions.
            ignoreCustomFragments: [/\{\{[\s\S]*?\}\}/g],
            minifyCSS: false,
            minifyJS: false,
            removeAttributeQuotes: false,
            removeEmptyAttributes: false,
            sortAttributes: false,
            sortClassName: false
        });
    } catch {
        return html;
    }
}

function literalText(node) {
    if (!node) {
        return undefined;
    }
    if (node.type === 'Literal' && typeof node.value === 'string') {
        return node.value;
    }
    if (node.type === 'TemplateLiteral') {
        if (node.expressions.length > 0) {
            return undefined;
        }
        return node.quasis.map(quasi => quasi.value.cooked ?? quasi.value.raw).join('');
    }
    return undefined;
}

function propertyName(node) {
    if (!node || node.type !== 'Property' || node.computed) {
        return '';
    }
    if (node.key.type === 'Identifier') {
        return node.key.name;
    }
    if (node.key.type === 'Literal' && typeof node.key.value === 'string') {
        return node.key.value;
    }
    return '';
}

function collectEdits(node, parent, key, edits) {
    if (!node || typeof node !== 'object') {
        return;
    }
    if (Array.isArray(node)) {
        node.forEach(child => collectEdits(child, parent, key, edits));
        return;
    }
    if (typeof node.type !== 'string') {
        // Plain metadata objects (loc, positions) - nothing to transform.
        return;
    }
    const apply = (kind) => {
        const text = literalText(node);
        if (text === undefined) {
            return;
        }
        const transform = kind === 'html' ? minifyHtmlText : minifyCssText;
        edits.push({ node, text, transform });
    };
    if (parent && parent.type === 'Property' && propertyName(parent) === 'template') {
        apply('html');
    } else if (parent && parent.type === 'VariableDeclarator'
        && parent.id && parent.id.type === 'Identifier'
        && /(?:^|_)CSS$/i.test(parent.id.name)) {
        apply('css');
    } else if (parent && parent.type === 'Property'
        && /^(?:style|styles|css)$/i.test(propertyName(parent))) {
        apply('css');
    }
    for (const childKey of Object.keys(node)) {
        if (childKey === 'type' || childKey === 'start' || childKey === 'end' || childKey === 'loc') {
            continue;
        }
        collectEdits(node[childKey], node, childKey, edits);
    }
}

/**
 * Minify inline templates/styles in one emitted ESM module.
 * Returns the original text when the module has nothing to rewrite.
 */
async function minifyInlineCode(source) {
    if (!source || !/(template\s*:|_CSS\s*=|style(?:s)?\s*:)/.test(source)) {
        return source;
    }
    let ast;
    try {
        ast = acorn.parse(source, {
            ecmaVersion: 'latest',
            sourceType: 'module',
            allowHashBang: true
        });
    } catch {
        return source;
    }
    const edits = [];
    collectEdits(ast, undefined, undefined, edits);
    if (!edits.length) {
        return source;
    }
    const resolved = [];
    for (const edit of edits) {
        const text = await edit.transform(edit.text);
        if (typeof text === 'string' && text.length < edit.text.length) {
            resolved.push({ start: edit.node.start, end: edit.node.end, text: JSON.stringify(text) });
        }
    }
    if (!resolved.length) {
        return source;
    }
    resolved.sort((a, b) => b.start - a.start);
    let output = source;
    for (const edit of resolved) {
        output = output.slice(0, edit.start) + edit.text + output.slice(edit.end);
    }
    return output;
}

module.exports = {
    minifyInlineCode,
    minifyCssText,
    minifyHtmlText
};
