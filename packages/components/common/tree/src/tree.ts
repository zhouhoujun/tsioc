import { Attribute, Component, Computed } from '@tsdi/components';
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
        <li class="{{entry.className}}" role="treeitem"
            aria-level="{{entry.depth + 1}}"
            aria-expanded="{{entry.expanded}}"
            aria-selected="{{entry.selected}}"
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
        const walk = (nodes: TreeNode[], depth: number, prefix: string): void => {
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
                    walk(node.children!, depth + 1, `${key}.`);
                }
            });
        };
        walk(this.items, 0, '');
        return rows;
    }

    select(entry: TreeViewItem): void {
        if (!entry || entry.disabled) {
            return;
        }
        this.selectedId = entry.key;
        this.selectAction?.(entry.item);
    }

    toggle(entry: TreeViewItem, event?: Event): void {
        event?.stopPropagation?.();
        if (!entry || !entry.hasChildren || entry.disabled) {
            return;
        }
        const ids = new Set((Array.isArray(this.expandedIds) ? this.expandedIds : []).map(String));
        const next = !ids.has(entry.key);
        if (next) {
            ids.add(entry.key);
        } else {
            ids.delete(entry.key);
        }
        this.expandedIds = [...ids];
        this.toggleAction?.(entry.item, next);
    }
}
