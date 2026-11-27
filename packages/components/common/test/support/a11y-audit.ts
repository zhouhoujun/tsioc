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
