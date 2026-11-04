/**
 * Minimal CSS stylesheet support for the TUI renderer.
 *
 * TUI components should describe semantic classes; the host supplies the
 * compiled stylesheet (the same CSS used by the web console). Inline
 * `v-style` remains only as a dynamic override.
 */
export interface ConsoleStyleRule {
    selector: string;
    declarations: Record<string, string>;
    specificity: number;
    order: number;
}

export interface ConsoleStyleSelector {
    tag?: string;
    classes: string[];
    attributes: Array<{ name: string; value?: string }>;
}

export function parseConsoleStyleSheet(css: string): ConsoleStyleRule[] {
    const rules: ConsoleStyleRule[] = [];
    const source = stripCssComments(String(css || ''));
    let order = 0;
    for (const match of source.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
        const selectorText = match[1].trim();
        const declarations = parseDeclarations(match[2]);
        if (!selectorText || !Object.keys(declarations).length) {
            continue;
        }
        for (const selector of selectorText.split(',')) {
            const trimmed = selector.trim();
            if (!trimmed || /[:>+~]/.test(trimmed)) {
                // Descendant/pseudo selectors are intentionally not guessed;
                // keep the parser honest and let the host compile them away.
                continue;
            }
            rules.push({
                selector: trimmed,
                declarations,
                specificity: selectorSpecificity(trimmed),
                order: order++
            });
        }
    }
    return rules;
}

export function resolveConsoleStyleSheet(
    element: { tagName?: string; getAttribute?: (name: string) => string | null },
    rules: ConsoleStyleRule[]
): Record<string, string> {
    const tag = String(element?.tagName || '').toLowerCase();
    const className = String(element?.getAttribute?.('class') || '').trim();
    const classes = new Set(className.split(/\s+/).filter(Boolean));
    const attributes = new Map<string, string>();
    for (const name of ['role', 'aria-selected', 'aria-label', 'data-hover']) {
        const value = element?.getAttribute?.(name);
        if (value != null) {
            attributes.set(name, String(value));
        }
    }
    const matched = rules
        .filter(rule => selectorMatches(rule.selector, tag, classes, attributes))
        .sort((left, right) => left.specificity - right.specificity || left.order - right.order);
    const declarations: Record<string, string> = {};
    for (const rule of matched) {
        Object.assign(declarations, rule.declarations);
    }
    return declarations;
}

function selectorMatches(
    selector: string,
    tag: string,
    classes: Set<string>,
    attributes: Map<string, string>
): boolean {
    const parsed = parseSelector(selector);
    if (!parsed) {
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

function parseDeclarations(value: string): Record<string, string> {
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
