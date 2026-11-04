/**
 * Minimal CSS stylesheet support for the TUI renderer.
 *
 * TUI components should describe semantic classes; the host supplies the
 * compiled stylesheet (the same CSS used by the web console). Inline
 * Standard `[style]` remains only as a dynamic override.
 */
export interface ConsoleStyleRule {
    selector: string;
    declarations: Record<string, string>;
    specificity: number;
    order: number;
    /** Parsed selector; computed once so element matching is regex-free. */
    parsed?: ConsoleStyleSelector;
}

export interface ConsoleStyleSelector {
    tag?: string;
    classes: string[];
    attributes: Array<{ name: string; value?: string }>;
    /** Apply only while the pointer hovers this element. */
    hover?: boolean;
}

/** Remove keyframe blocks before parsing element style rules. */
export function stripConsoleKeyframes(css: string): string {
    return String(css || '').replace(/@(?:-\w+-)?keyframes\s+[\w-]+\s*\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, '');
}

export function parseConsoleStyleSheet(css: string): ConsoleStyleRule[] {
    const rules: ConsoleStyleRule[] = [];
    const source = stripCssComments(String(css || ''));
    let order = 0;
    for (const match of source.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
        const selectorText = match[1].trim();
        const declarations = parseConsoleDeclarations(match[2]);
        if (!selectorText || !Object.keys(declarations).length) {
            continue;
        }
        for (const selector of selectorText.split(',')) {
            let trimmed = selector.trim();
            const hover = trimmed.endsWith(':hover');
            if (hover) {
                trimmed = trimmed.slice(0, -':hover'.length).trim();
            }
            if (!trimmed || /[:>+~]/.test(trimmed)) {
                // Descendant/pseudo selectors are intentionally not guessed;
                // keep the parser honest and let the host compile them away.
                continue;
            }
            const parsed = parseSelector(trimmed);
            if (!parsed) {
                continue;
            }
            parsed.hover = hover;
            rules.push({
                selector: selector.trim(),
                declarations,
                specificity: selectorSpecificity(trimmed) + (hover ? 10 : 0),
                order: order++,
                parsed
            });
        }
    }
    return rules;
}

const styleCache = new WeakMap<ConsoleStyleRule[], Map<string, Record<string, string>>>();

export function resolveConsoleStyleSheet(
    element: { tagName?: string; getAttribute?: (name: string) => string | null },
    rules: ConsoleStyleRule[],
    hovered = false
): Record<string, string> {
    const tag = String(element?.tagName || '').toLowerCase();
    const className = String(element?.getAttribute?.('class') || '').trim();
    const attributeEntries: string[] = [];
    for (const name of ['role', 'aria-selected', 'aria-label', 'data-hover', 'data-template-kind', 'data-semantic-kind', 'data-status', 'data-selected', 'data-tone', 'data-code', 'data-table', 'data-kind']) {
        const value = element?.getAttribute?.(name);
        if (value != null) {
            attributeEntries.push(`${name}=${String(value)}`);
        }
    }
    const cacheKey = `${hovered ? 'h' : 'n'}\u0000${tag}\u0000${className}\u0000${attributeEntries.join('\u0001')}`;
    let bucket = styleCache.get(rules);
    if (!bucket) {
        bucket = new Map();
        styleCache.set(rules, bucket);
    }
    const cached = bucket.get(cacheKey);
    if (cached) {
        return cached;
    }
    const classes = new Set(className.split(/\s+/).filter(Boolean));
    const attributes = new Map<string, string>();
    for (const entry of attributeEntries) {
        const index = entry.indexOf('=');
        attributes.set(entry.slice(0, index), entry.slice(index + 1));
    }
    const matched: ConsoleStyleRule[] = [];
    for (const rule of rules) {
        if (selectorMatches(rule.parsed || (rule.parsed = parseSelector(rule.selector)), tag, classes, attributes, hovered)) {
            matched.push(rule);
        }
    }
    matched.sort((left, right) => left.specificity - right.specificity || left.order - right.order);
    const declarations: Record<string, string> = {};
    for (const rule of matched) {
        Object.assign(declarations, rule.declarations);
    }
    if (bucket.size > 4096) {
        bucket.clear();
    }
    bucket.set(cacheKey, declarations);
    return declarations;
}

function selectorMatches(
    parsed: ConsoleStyleSelector | undefined,
    tag: string,
    classes: Set<string>,
    attributes: Map<string, string>,
    hovered: boolean
): boolean {
    if (!parsed || (parsed.hover && !hovered)) {
        return false;
    }
    if (parsed.tag && parsed.tag !== tag) {
        return false;
    }
    for (const className of parsed.classes) {
        if (!classes.has(className)) {
            return false;
        }
    }
    for (const attribute of parsed.attributes) {
        if (!attributes.has(attribute.name)) {
            return false;
        }
        if (attribute.value != null && attributes.get(attribute.name) !== attribute.value) {
            return false;
        }
    }
    return true;
}

function parseSelector(selector: string): ConsoleStyleSelector | undefined {
    const classes: string[] = [];
    const attributes: Array<{ name: string; value?: string }> = [];
    let tag = '';
    let rest = selector;
    const tagMatch = /^([a-zA-Z][\w-]*)/.exec(rest);
    if (tagMatch) {
        tag = tagMatch[1].toLowerCase();
        rest = rest.slice(tagMatch[0].length);
    }
    while (rest) {
        const classMatch = /^\.([\w-]+)/.exec(rest);
        if (classMatch) {
            classes.push(classMatch[1]);
            rest = rest.slice(classMatch[0].length);
            continue;
        }
        const attrMatch = /^\[([\w-]+)(?:=(?:"([^"]*)"|'([^']*)'|([^\]]+)))?\]/.exec(rest);
        if (attrMatch) {
            attributes.push({
                name: attrMatch[1],
                value: attrMatch[2] ?? attrMatch[3] ?? attrMatch[4]?.trim()
            });
            rest = rest.slice(attrMatch[0].length);
            continue;
        }
        return undefined;
    }
    return { tag: tag || undefined, classes, attributes };
}

function selectorSpecificity(selector: string): number {
    const classes = (selector.match(/\./g) || []).length;
    const attributes = (selector.match(/\[/g) || []).length;
    const tags = /^[a-zA-Z]/.test(selector) ? 1 : 0;
    return classes * 100 + attributes * 100 + tags;
}

export function parseConsoleDeclarations(value: string): Record<string, string> {
    const declarations: Record<string, string> = {};
    for (const part of String(value || '').split(';')) {
        const index = part.indexOf(':');
        if (index <= 0) {
            continue;
        }
        const name = part.slice(0, index).trim();
        const declaration = part.slice(index + 1).replace(/!important\s*$/i, '').trim();
        if (name && declaration) {
            declarations[name] = declaration;
        }
    }
    return declarations;
}

function stripCssComments(css: string): string {
    return css.replace(/\/\*[\s\S]*?\*\//g, '');
}
