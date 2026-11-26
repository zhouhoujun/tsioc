import expect = require('expect');
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..');

function source(name: string): string {
    return readFileSync(join(ROOT, name), 'utf8');
}

/**
 * Cross-widget accessibility matrix. Individual behaviour tests live next to
 * each widget; this gate keeps the semantic roles/ARIA contract from silently
 * disappearing during refactors.
 */
describe('common widget accessibility matrix', () => {
    const matrix: Array<[string, string, string[]]> = [
        ['button/src/button.ts', 'button', ['aria-label', 'aria-busy', 'aria-pressed']],
        ['badge/src/badge.ts', 'badge', ['role=', 'aria-pressed']],
        ['checkbox/src/checkbox.ts', 'checkbox', ['role=', 'aria-checked']],
        ['switch/src/switch.ts', 'switch', ['role=', 'aria-checked']],
        ['radio-group/src/radio-group.ts', 'radio group', ['role="radiogroup"', 'role="radio"', 'aria-checked']],
        ['autocomplete/src/autocomplete.ts', 'autocomplete', ['role="combobox"', 'role="listbox"', 'role="option"', 'aria-activedescendant']],
        ['dialog/src/dialog.ts', 'dialog', ['role="dialog"', 'aria-modal', 'aria-labelledby']],
        ['data-table/src/data-table.ts', 'data table', ['role="table"', 'role="columnheader"', 'role="row"', 'aria-sort']],
        ['tree/src/tree.ts', 'tree', ['role="tree"', 'role="treeitem"', 'aria-expanded']],
        ['tabs/src/tabs.ts', 'tabs', ["'tabpanel'", 'aria-labelledby', 'aria-hidden']],
        ['tab-bar/src/tab-bar.ts', 'tab bar', ['role="tab"', 'aria-selected', 'aria-orientation']],
        ['slider/src/slider.ts', 'slider', ['role="slider"', 'aria-valuemin', 'aria-valuenow']],
        ['pagination/src/pagination.ts', 'pagination', ['aria-label', 'aria-current']],
        ['list/src/list.ts', 'list', ['role="dialog"', 'role="listbox"', 'role="option"']]
    ];

    it('keeps the semantic roles and ARIA state per widget', () => {
        const missing: string[] = [];
        for (const [file, label, patterns] of matrix) {
            const text = source(file);
            for (const pattern of patterns) {
                if (!text.includes(pattern)) {
                    missing.push(`${label}: ${pattern}`);
                }
            }
        }
        expect(missing).toEqual([]);
    });
});
