import { Attribute, Component, Computed, ElementRef } from '@tsdi/components';
import { Optional } from '@tsdi/ioc';
import { focusNth } from '../../src/focus';
import { markElementRefRaw } from '../../src/raw-element';
import { iconSizeFor } from '../../src/ui';

export interface TreeNode {
    id?: string;
    label: string;
    icon?: string;
    iconGlyph?: string;
    badge?: string | number;
    children?: TreeNode[];
    expanded?: boolean;
    selected?: boolean;
    disabled?: boolean;
}

interface TreeViewItem {
    key: string;
    index: number;
    parentKey: string;
    item: TreeNode;
    depth: number;
    label: string;
    icon: string;
    iconGlyph: string;
    badge: string;
    hasChildren: boolean;
    expanded: boolean;
    selected: boolean;
    disabled: boolean;
    indentText: string;
    toggled: string;
    className: string;
}

/**
 * Hierarchical tree with flattened rendering. Expansion state is owned by the
 * host (`expandedIds` + per-node `expanded`) and every change replaces the
 * array so the reactive bindings refresh.
 */
@Component({
    selector: 'ui-tree',
    template: `
    <ul class="ui-tree {{treeClass}}" role="tree" aria-label="{{ariaLabel}}">
        <li class="{{nodeClass(entry)}}" role="treeitem"
            aria-level="{{entry.depth + 1}}"
            aria-expanded="{{rowAriaExpanded(entry)}}"
            aria-selected="{{rowSelected(entry)}}"
            aria-disabled="{{entry.disabled}}"
            tabindex="{{tabIndexFor(entry)}}"
            focusable="{{!entry.disabled}}"
            @keydown="onKeydown(entry, $event)"
            v-for="entry in viewItems" trackBy="key">
            <span class="ui-tree-row" @click="select(entry)">
                <span class="ui-tree-indent" aria-hidden="true">{{entry.indentText}}</span>
                <span class="ui-tree-toggle" v-if="entry.hasChildren" @click="toggle(entry, $event)">{{entry.toggled}}</span>
                <span class="ui-tree-toggle is-leaf" v-if="!entry.hasChildren" aria-hidden="true"> </span>
                <icon class="ui-tree-icon" v-if="entry.icon" [name]="entry.icon" [glyph]="entry.iconGlyph || entry.icon" [size]="iconSize"></icon>
                <span class="ui-tree-label">{{entry.label}}</span>
                <span class="ui-tree-badge" v-if="entry.badge">{{entry.badge}}</span>
            </span>
        </li>
    </ul>`
})
export class TreeComponent {
    constructor(@Optional() protected elementRef?: ElementRef) {
        markElementRefRaw(elementRef);
    }

    @Attribute() items: TreeNode[] = [];
    @Attribute() expandedIds: string[] = [];
    @Attribute() selectedId = '';
    @Attribute() indent = 2;
    @Attribute() indentChar = ' ';
    @Attribute() ariaLabel = 'Tree';
    @Attribute() className = '';
    @Attribute() selectAction?: (node: TreeNode) => void;
    @Attribute() toggleAction?: (node: TreeNode, expanded: boolean) => void;

    get treeClass(): string {
        return this.className;
    }

    get iconSize(): 'xs' | 'sm' | 'md' | 'lg' {
        return iconSizeFor('md');
    }

    @Computed()
    get viewItems(): TreeViewItem[] {
        const expanded = new Set((Array.isArray(this.expandedIds) ? this.expandedIds : []).map(String));
        const rows: TreeViewItem[] = [];
        const walk = (nodes: TreeNode[], depth: number, prefix: string, parentKey: string): void => {
            (Array.isArray(nodes) ? nodes : []).forEach((node, index) => {
                if (!node) {
                    return;
                }
                const key = String(node.id ?? `${prefix}${index}`);
                const hasChildren = Array.isArray(node.children) && node.children.length > 0;
                const isExpanded = node.expanded === true || expanded.has(key);
                const selected = node.selected === true || (!!this.selectedId && String(this.selectedId) === key);
                const disabled = node.disabled === true;
                rows.push({
                    key,
                    index: rows.length,
                    parentKey,
                    item: node,
                    depth,
                    label: String(node.label ?? ''),
                    icon: String(node.icon ?? ''),
                    iconGlyph: String(node.iconGlyph ?? ''),
                    badge: node.badge == null ? '' : String(node.badge),
                    hasChildren,
                    expanded: hasChildren && isExpanded,
                    selected,
                    disabled,
                    indentText: this.indentChar.repeat(Math.max(0, depth) * Math.max(0, Math.floor(Number(this.indent) || 2))),
                    toggled: hasChildren ? (isExpanded ? '▾' : '▸') : '',
                    className: [
                        'ui-tree-node',
                        selected ? 'is-selected' : '',
                        disabled ? 'is-disabled' : ''
                    ].filter(Boolean).join(' ')
                });
                if (hasChildren && isExpanded) {
                    walk(node.children!, depth + 1, `${key}.`, key);
                }
            });
        };
        walk(this.items, 0, '', '');
        return rows;
    }

    nodeClass(entry: TreeViewItem): string {
        return this.currentRow(entry)?.className || entry.className;
    }

    rowSelected(entry: TreeViewItem): boolean {
        return !!this.currentRow(entry)?.selected;
    }

    /** `aria-expanded` is only meaningful for branches. */
    rowAriaExpanded(entry: TreeViewItem): string {
        const row = this.currentRow(entry);
        return row?.hasChildren ? String(row.expanded) : '';
    }

    /** Selected (or first enabled) row is the only tab stop. */
    tabIndexFor(entry: TreeViewItem): number {
        if (!entry || entry.disabled) {
            return -1;
        }
        const rows = this.viewItems;
        const selected = rows.find(row => row.selected && !row.disabled);
        if (selected) {
            return selected.key === entry.key ? 0 : -1;
        }
        const first = rows.find(row => !row.disabled);
        return first && first.key === entry.key ? 0 : -1;
    }

    select(entry: TreeViewItem): void {
        const row = this.currentRow(entry);
        if (!row || row.disabled) {
            return;
        }
        this.selectedId = row.key;
        focusNth(this.elementRef?.nativeElement, '.ui-tree-node', row.index);
        this.selectAction?.(row.item);
    }

    toggle(entry: TreeViewItem, event?: Event): void {
        event?.stopPropagation?.();
        const row = this.currentRow(entry);
        if (!row || !row.hasChildren || row.disabled) {
            return;
        }
        const ids = new Set((Array.isArray(this.expandedIds) ? this.expandedIds : []).map(String));
        const next = !ids.has(row.key);
        if (next) {
            ids.add(row.key);
        } else {
            ids.delete(row.key);
        }
        this.expandedIds = [...ids];
        focusNth(this.elementRef?.nativeElement, '.ui-tree-node', row.index);
        this.toggleAction?.(row.item, next);
    }

    /** MUI TreeView style keyboard model over the flattened visible rows. */
    onKeydown(entry: TreeViewItem, event: any): void {
        const row = this.currentRow(entry);
        if (!row || row.disabled) {
            return;
        }
        const key = String(event?.key || '');
        if (key === 'Enter' || key === ' ' || key === 'Spacebar') {
            event?.preventDefault?.();
            this.select(row);
            return;
        }
        if (key === 'ArrowDown') {
            event?.preventDefault?.();
            this.move(row.index, 1);
            return;
        }
        if (key === 'ArrowUp') {
            event?.preventDefault?.();
            this.move(row.index, -1);
            return;
        }
        if (key === 'Home' || key === 'End') {
            event?.preventDefault?.();
            const rows = this.viewItems;
            const target = key === 'Home'
                ? rows.find(item => !item.disabled)
                : [...rows].reverse().find(item => !item.disabled);
            if (target) {
                this.select(target);
            }
            return;
        }
        if (key === 'ArrowRight') {
            event?.preventDefault?.();
            if (!row.hasChildren) {
                return;
            }
            if (!row.expanded) {
                this.toggle(row);
                return;
            }
            const child = this.viewItems[row.index + 1];
            if (child) {
                this.select(child);
            }
            return;
        }
        if (key === 'ArrowLeft') {
            event?.preventDefault?.();
            if (row.hasChildren && row.expanded) {
                this.toggle(row);
                return;
            }
            const parent = row.parentKey
                ? this.viewItems.find(item => item.key === row.parentKey)
                : undefined;
            if (parent) {
                this.select(parent);
            }
        }
    }

    protected currentRow(entry: TreeViewItem): TreeViewItem | undefined {
        return entry ? this.viewItems.find(row => row.key === entry.key) : undefined;
    }

    /** Move selection to the next enabled visible row (clamped, no wrap). */
    protected move(from: number, delta: number): void {
        const rows = this.viewItems;
        for (let index = from + delta; index >= 0 && index < rows.length; index += delta) {
            if (!rows[index].disabled) {
                this.select(rows[index]);
                return;
            }
        }
    }
}
