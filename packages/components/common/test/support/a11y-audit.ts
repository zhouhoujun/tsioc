/**
 * Deterministic DOM accessibility audit used by the common quality gate.
 * It intentionally checks the invariants the component library owns (names,
 * ARIA state pairs, duplicate ids) instead of shipping a full axe runtime.
 */

export interface A11yViolation {
    rule: string;
    element: string;
    detail: string;
}

const INTERACTIVE = [
    'button', 'input', 'select', 'textarea',
    '[role="button"]', '[role="tab"]', '[role="menuitem"]',
    '[role="menuitemcheckbox"]', '[role="menuitemradio"]',
    '[role="option"]', '[role="checkbox"]', '[role="switch"]',
    '[role="radio"]', '[role="slider"]', '[role="treeitem"]',
    '[role="combobox"]', '[role="progressbar"]', '[role="link"]'
].join(',');

const NAME_FROM_LABEL = 'button, [role="button"], [role="tab"], [role="menuitem"], [role="menuitemcheckbox"], [role="menuitemradio"], [role="option"], [role="checkbox"], [role="switch"], [role="radio"], [role="slider"], [role="treeitem"], [role="combobox"], [role="progressbar"], [role="link"]';

function textOf(node: any): string {
    return String(node?.textContent ?? '').replace(/\s+/g, ' ').trim();
}

function labelText(doc: any, id: string): string {
    if (!id) {
        return '';
    }
    return textOf(doc?.querySelector?.(`label[for="${id}"]`));
}

function accessibleName(doc: any, node: any): string {
    const aria = String(node?.getAttribute?.('aria-label') || '').trim();
    if (aria) {
        return aria;
    }
    const labelledby = String(node?.getAttribute?.('aria-labelledby') || '').split(/\s+/).filter(Boolean);
    if (labelledby.length) {
        const text = labelledby.map((id: string) => textOf(doc?.getElementById?.(id))).join(' ').trim();
        if (text) {
            return text;
        }
    }
    const id = String(node?.getAttribute?.('id') || '');
    const labelled = labelText(doc, id);
    if (labelled) {
        return labelled;
    }
    const title = String(node?.getAttribute?.('title') || '').trim();
    if (title) {
        return title;
    }
    const placeholder = String(node?.getAttribute?.('placeholder') || '').trim();
    if (placeholder) {
        return placeholder;
    }
    return textOf(node);
}

function describe(node: any): string {
    const tag = String(node?.tagName || 'node').toLowerCase();
    const role = String(node?.getAttribute?.('role') || '');
    const id = String(node?.getAttribute?.('data-menu-id') || node?.getAttribute?.('id') || '');
    return `<${tag}${role ? ` role=${role}` : ''}${id ? ` ${id}` : ''}>`;
}

/** Collect accessibility contract violations for a rendered root. */
export function auditA11y(root: any, doc: any): A11yViolation[] {
    const violations: A11yViolation[] = [];
    const scope = root?.querySelectorAll ? root : doc;
    const nodes = Array.from(scope?.querySelectorAll?.('*') || []) as any[];
    if (root?.getAttribute) {
        nodes.unshift(root);
    }

    const ids = new Map<string, number>();
    nodes.forEach(node => {
        const id = String(node?.getAttribute?.('id') || '');
        if (id) {
            ids.set(id, (ids.get(id) || 0) + 1);
        }
    });
    ids.forEach((count, id) => {
        if (count > 1) {
            violations.push({ rule: 'duplicate-id', element: id, detail: `${id} appears ${count} times` });
        }
    });

    const interactive = nodes.filter(node => node?.matches?.(INTERACTIVE));
    interactive.forEach(node => {
        if (String(node.getAttribute?.('aria-hidden') || '') === 'true') {
            return;
        }
        const name = accessibleName(doc, node);
        if (!name) {
            violations.push({ rule: 'missing-name', element: describe(node), detail: 'interactive element has no accessible name' });
            return;
        }
        // Glyph-only names ("+", "✕", "…") are unusable with a screen reader.
        if (!/[\p{L}\p{N}]/u.test(name) && node.matches?.(NAME_FROM_LABEL)) {
            violations.push({ rule: 'glyph-only-name', element: describe(node), detail: `name "${name}" has no words` });
        }
    });

    const required: Array<[string, string]> = [
        ['[role="checkbox"]', 'aria-checked'],
        ['[role="switch"]', 'aria-checked'],
        ['[role="menuitemcheckbox"]', 'aria-checked'],
        ['[role="menuitemradio"]', 'aria-checked'],
        ['[role="tab"]', 'aria-selected'],
        ['[role="option"]', 'aria-selected'],
        ['[role="radio"]', 'aria-checked'],
        ['[role="treeitem"]', 'aria-selected'],
        ['[role="slider"]', 'aria-valuenow'],
        ['[role="progressbar"]', 'aria-valuenow']
    ];
    required.forEach(([selector, attribute]) => {
        (Array.from(scope?.querySelectorAll?.(selector) || []) as any[]).forEach(node => {
            if (!node.hasAttribute?.(attribute)) {
                violations.push({ rule: 'missing-aria-state', element: describe(node), detail: `${selector} is missing ${attribute}` });
            }
        });
    });

    (Array.from(scope?.querySelectorAll?.('[aria-haspopup]') || []) as any[]).forEach(node => {
        const popup = String(node.getAttribute?.('aria-haspopup') || '');
        if (popup && popup !== 'false' && !node.hasAttribute?.('aria-expanded')) {
            violations.push({ rule: 'missing-aria-expanded', element: describe(node), detail: `aria-haspopup="${popup}" needs aria-expanded` });
        }
    });

    (Array.from(scope?.querySelectorAll?.('[role="button"]') || []) as any[]).forEach(node => {
        const disabled = node.hasAttribute?.('disabled') || node.getAttribute?.('aria-disabled') === 'true';
        if (!disabled && node.getAttribute?.('aria-hidden') !== 'true' && !node.hasAttribute?.('tabindex')) {
            violations.push({ rule: 'button-focus', element: describe(node), detail: 'role="button" is missing tabindex' });
        }
    });

    (Array.from(scope?.querySelectorAll?.('[role="region"]') || []) as any[]).forEach(node => {
        if (!node.hasAttribute?.('aria-label') && !node.hasAttribute?.('aria-labelledby')) {
            violations.push({ rule: 'region-name', element: describe(node), detail: 'region has no accessible name' });
        }
    });

    (Array.from(scope?.querySelectorAll?.('[role="menubar"], [role="menu"]') || []) as any[]).forEach(node => {
        if (!node.hasAttribute?.('aria-label') && !node.hasAttribute?.('aria-labelledby')) {
            violations.push({ rule: 'menu-name', element: describe(node), detail: 'menu container has no accessible name' });
        }
    });

    const hasId = (id: string): boolean => {
        if (!id) {
            return false;
        }
        const selector = `[id="${id.replace(/"/g, '\\"')}"]`;
        return !!doc?.getElementById?.(id) || !!(scope?.querySelector?.(selector));
    };
    const states: Array<[string, string[]]> = [
        ['aria-expanded', ['true', 'false']],
        ['aria-checked', ['true', 'false', 'mixed']],
        ['aria-selected', ['true', 'false']]
    ];
    states.forEach(([attribute, allowed]) => {
        (Array.from(scope?.querySelectorAll?.(`[${attribute}]`) || []) as any[]).forEach(node => {
            const value = String(node.getAttribute?.(attribute) || '');
            if (value && !allowed.includes(value)) {
                violations.push({
                    rule: `invalid-${attribute}`,
                    element: describe(node),
                    detail: `${attribute}="${value}" is not ${allowed.join('/')}`
                });
            }
        });
    });

    (Array.from(scope?.querySelectorAll?.('[aria-activedescendant]') || []) as any[]).forEach(node => {
        const id = String(node.getAttribute?.('aria-activedescendant') || '').trim();
        if (id && !hasId(id)) {
            violations.push({ rule: 'missing-activedescendant', element: describe(node), detail: `aria-activedescendant="${id}" does not exist` });
        }
    });

    ['aria-controls', 'aria-labelledby', 'aria-describedby'].forEach(attribute => {
        (Array.from(scope?.querySelectorAll?.(`[${attribute}]`) || []) as any[]).forEach(node => {
            const ids = String(node.getAttribute?.(attribute) || '').split(/\s+/).filter(Boolean);
            ids.forEach(id => {
                if (!hasId(id)) {
                    violations.push({
                        rule: 'missing-aria-reference',
                        element: describe(node),
                        detail: `${attribute}="${id}" does not exist`
                    });
                }
            });
        });
    });

    (Array.from(scope?.querySelectorAll?.('img') || []) as any[]).forEach(node => {
        if (!node.hasAttribute?.('alt') && String(node.getAttribute?.('aria-hidden') || '') !== 'true') {
            violations.push({ rule: 'image-alt', element: describe(node), detail: 'img is missing alt text' });
        }
    });

    (Array.from(scope?.querySelectorAll?.('[role="img"]') || []) as any[]).forEach(node => {
        if (!accessibleName(doc, node).trim()) {
            violations.push({ rule: 'image-role-name', element: describe(node), detail: 'role=img has no accessible name' });
        }
    });

    (Array.from(scope?.querySelectorAll?.('[tabindex]') || []) as any[]).forEach(node => {
        if (Number(node.getAttribute?.('tabindex')) > 0) {
            violations.push({ rule: 'positive-tabindex', element: describe(node), detail: 'avoid tabindex > 0' });
        }
    });

    (Array.from(scope?.querySelectorAll?.('[aria-valuenow]') || []) as any[]).forEach(node => {
        const value = String(node.getAttribute?.('aria-valuenow') || '');
        if (!/^-?\d+(?:\.\d+)?$/.test(value)) {
            violations.push({ rule: 'invalid-aria-valuenow', element: describe(node), detail: `aria-valuenow="${value}" is not numeric` });
        }
    });

    (Array.from(scope?.querySelectorAll?.('[aria-level]') || []) as any[]).forEach(node => {
        const level = Number(node.getAttribute?.('aria-level'));
        if (!Number.isInteger(level) || level < 1) {
            violations.push({ rule: 'invalid-aria-level', element: describe(node), detail: `aria-level="${node.getAttribute?.('aria-level')}" is not a positive integer` });
        }
    });

    (Array.from(scope?.querySelectorAll?.('[role="dialog"], [role="alertdialog"]') || []) as any[]).forEach(node => {
        const labelled = node.getAttribute?.('aria-label')
            || node.getAttribute?.('aria-labelledby')
            || textOf(node);
        if (!String(labelled || '').trim()) {
            violations.push({ rule: 'dialog-name', element: describe(node), detail: 'dialog has no accessible name' });
        }
    });

    return violations;
}

export function formatViolations(violations: A11yViolation[]): string {
    return violations.map(item => `${item.rule}: ${item.element} — ${item.detail}`).join('\n');
}
