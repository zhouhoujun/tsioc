import { Attribute, Component, Computed, ElementRef } from '@tsdi/components';
import { Optional } from '@tsdi/ioc';
import { focusNth } from '../../src/focus';
import { markElementRefRaw } from '../../src/raw-element';
import { iconSizeFor, normalizeBoolean } from '../../src/ui';

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
    /** Lazy branch: children are fetched by `loadChildren`. */
    lazy?: boolean;
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
    checked: boolean;
    indeterminate: boolean;
    active: boolean;
    loading: boolean;
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
    <ul class="ui-tree {{treeClass}}" role="tree" aria-label="{{ariaLabel}}"
        aria-multiselectable="{{multiple || checkable}}">
        <li class="{{nodeClass(entry)}}" role="treeitem"
            aria-level="{{entry.depth + 1}}"
            aria-expanded="{{rowAriaExpanded(entry)}}"
            aria-selected="{{rowSelected(entry)}}"
            aria-checked="{{checkable ? rowChecked(entry) : null}}"
            aria-disabled="{{entry.disabled}}"
            tabindex="{{tabIndexFor(entry)}}"
            focusable="{{!entry.disabled}}"
            @keydown="onKeydown(entry, $event)"
            v-for="entry in visibleRows" trackBy="key">
            <span class="ui-tree-row" @click="activate(entry)">
                <span class="ui-tree-indent" aria-hidden="true">{{entry.indentText}}</span>
                <span class="ui-tree-check" role="checkbox" tabindex="-1" focusable="true"
                    aria-checked="{{rowIndeterminate(entry) ? 'mixed' : rowChecked(entry)}}" aria-label="{{checkLabel}}"
                    v-if="checkable" @click="toggleCheck(entry, $event)"
                    @keydown="checkKeydown(entry, $event)">{{rowChecked(entry) ? '✓' : rowIndeterminate(entry) ? '–' : ' '}}</span>
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
    @Attribute() checkLabel = 'Select node';
    @Attribute() checkedIds: Array<string | number> = [];
    /** Case-insensitive label/id filter; ancestors of matches stay visible. */
    @Attribute() filter = '';
    /** Optional row window; 0 keeps every visible row. */
    @Attribute() maxVisible: number | string = 0;
    /** Checking a parent updates descendants and rolls up ancestors. */
    @Attribute()
    get cascade(): boolean { return this._cascade; }
    set cascade(value: boolean | string) { this._cascade = normalizeBoolean(value, true); }
    @Attribute() checkAction?: (keys: string[], node: TreeNode) => void;
    /** Lazy branch loader; return the children for an unloaded node. */
    @Attribute() loadChildren?: (node: TreeNode) => TreeNode[] | Promise<TreeNode[]>;
    @Attribute() loadErrorAction?: (error: any, node: TreeNode) => void;
    @Attribute()
    get checkable(): boolean { return this._checkable; }
    set checkable(value: boolean | string) { this._checkable = normalizeBoolean(value); }

    @Attribute()
    get multiple(): boolean { return this._multiple; }
    set multiple(value: boolean | string) { this._multiple = normalizeBoolean(value); }

    /** Roving focus also selects/emits; turn off for pickers that commit on activate. */
    @Attribute()
    get selectionFollowsFocus(): boolean { return this._selectionFollowsFocus; }
    set selectionFollowsFocus(value: boolean | string) { this._selectionFollowsFocus = normalizeBoolean(value, true); }

    /** Wrap ArrowUp/Down at the ends (pickers); trees usually stop at the edge. */
    @Attribute()
    get wrapFocus(): boolean { return this._wrapFocus; }
    set wrapFocus(value: boolean | string) { this._wrapFocus = normalizeBoolean(value); }
    @Attribute() selectAction?: (node: TreeNode) => void;
    @Attribute() toggleAction?: (node: TreeNode, expanded: boolean) => void;

    private _activeKey = '';
    private _checkable = false;
    private _multiple = false;
    private _cascade = true;
    private _selectionFollowsFocus = true;
    private _wrapFocus = false;
    private loadedChildren = new Map<string, TreeNode[]>();
    private loadingKeys: string[] = [];
    private typeaheadBuffer = '';
    private typeaheadAt = 0;

    get treeClass(): string {
        return this.className;
    }

    get iconSize(): 'xs' | 'sm' | 'md' | 'lg' {
        return iconSizeFor('md');
    }

    @Computed()
    get viewItems(): TreeViewItem[] {
        const expanded = new Set((Array.isArray(this.expandedIds) ? this.expandedIds : []).map(String));
        const filterText = String(this.filter || '').trim().toLocaleLowerCase();
        const source = filterText ? this.filterNodes(this.items, filterText) : (Array.isArray(this.items) ? this.items : []);
        const rows: TreeViewItem[] = [];
        const walk = (nodes: TreeNode[], depth: number, prefix: string, parentKey: string): void => {
            (Array.isArray(nodes) ? nodes : []).forEach((node, index) => {
                if (!node) {
                    return;
                }
                const key = String(node.id ?? `${prefix}${index}`);
                const children = Array.isArray(node.children) && node.children.length
                    ? node.children
                    : this.loadedChildren.get(key) || [];
                const hasChildren = children.length > 0 || node.lazy === true;
                const isExpanded = node.expanded === true || expanded.has(key) || !!filterText;
                const checked = (Array.isArray(this.checkedIds) ? this.checkedIds : []).some(id => String(id) === key);
                const selected = this._multiple
                    ? checked
                    : node.selected === true || (!!this.selectedId && String(this.selectedId) === key);
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
                    checked,
                    indeterminate: this.isIndeterminate(key, checked),
                    active: false,
                    loading: this.loadingKeys.includes(key),
                    disabled,
                    indentText: this.indentChar.repeat(Math.max(0, depth) * Math.max(0, Math.floor(Number(this.indent) || 2))),
                    toggled: hasChildren ? (isExpanded ? '▾' : '▸') : '',
                    className: [
                        'ui-tree-node',
                        selected ? 'is-selected' : '',
                        checked ? 'is-checked' : '',
                        disabled ? 'is-disabled' : ''
                    ].filter(Boolean).join(' ')
                });
                if (hasChildren && isExpanded && children.length) {
                    walk(children, depth + 1, `${key}.`, key);
                }
            });
        };
        walk(source, 0, '', '');
        // With selection-follows-focus the selected row is already the active one;
        // a separate roving class is only needed for activate-to-commit pickers.
        const activeKey = this._selectionFollowsFocus
            ? ''
            : (this._activeKey
                || rows.find(row => row.selected && !row.disabled)?.key
                || rows.find(row => !row.disabled)?.key
                || '');
        rows.forEach(row => {
            row.active = row.key === activeKey && !row.disabled;
            if (row.active) {
                row.className = [row.className, 'is-active'].filter(Boolean).join(' ');
            }
        });
        return rows;
    }

    protected filterNodes(nodes: TreeNode[], query: string): TreeNode[] {
        const result: TreeNode[] = [];
        (Array.isArray(nodes) ? nodes : []).forEach(node => {
            if (!node) { return; }
            const match = `${node.label ?? ''} ${node.id ?? ''}`.toLocaleLowerCase().includes(query);
            const children = node.children?.length ? this.filterNodes(node.children, query) : [];
            if (match || children.length) {
                result.push(children.length ? { ...node, children } : { ...node, children: [] });
            }
        });
        return result;
    }

    get maxVisibleCount(): number { return Math.max(0, Math.floor(Number(this.maxVisible) || 0)); }

    get windowStart(): number {
        const limit = this.maxVisibleCount;
        const rows = this.viewItems;
        if (!limit || rows.length <= limit) { return 0; }
        const active = this.activeRow();
        const index = active ? rows.findIndex(row => row.key === active.key) : 0;
        return Math.max(0, Math.min(rows.length - limit, index - Math.floor(limit / 2)));
    }

    get visibleRows(): TreeViewItem[] {
        const limit = this.maxVisibleCount;
        const rows = this.viewItems;
        return limit && rows.length > limit ? rows.slice(this.windowStart, this.windowStart + limit) : rows;
    }

    protected focusRow(row: TreeViewItem): void {
        const local = row.index - this.windowStart;
        if (local >= 0) { focusNth(this.elementRef?.nativeElement, '.ui-tree-node', local); }
    }

    nodeClass(entry: TreeViewItem): string {
        return this.currentRow(entry)?.className || entry.className;
    }

    rowSelected(entry: TreeViewItem): boolean {
        return !!this.currentRow(entry)?.selected;
    }

    rowChecked(entry: TreeViewItem): boolean {
        return !!this.currentRow(entry)?.checked;
    }

    rowIndeterminate(entry: TreeViewItem): boolean {
        return !!this.currentRow(entry)?.indeterminate;
    }

    protected isIndeterminate(key: string, checked: boolean): boolean {
        if (!this._checkable || checked || !this._cascade) {
            return false;
        }
        const node = this.findNode(key);
        if (!node) {
            return false;
        }
        const checkedSet = new Set((this.checkedIds || []).map(String));
        return this.descendantKeys(node).some(child => checkedSet.has(child));
    }

    protected findNode(key: string): TreeNode | undefined {
        const visit = (nodes: TreeNode[]): TreeNode | undefined => {
            for (const node of Array.isArray(nodes) ? nodes : []) {
                if (!node) { continue; }
                if (String(node.id ?? '') === String(key)) { return node; }
                const match = visit(node.children || []);
                if (match) { return match; }
            }
            return undefined;
        };
        return visit(this.items || []);
    }

    protected descendantKeys(node: TreeNode): string[] {
        const keys: string[] = [];
        const visit = (children: TreeNode[]) => {
            for (const child of Array.isArray(children) ? children : []) {
                if (!child) { continue; }
                keys.push(String(child.id ?? ''));
                visit(child.children || []);
            }
        };
        visit(node.children || []);
        return keys;
    }

    protected ancestorKeys(key: string): string[] {
        const path: string[] = [];
        const visit = (nodes: TreeNode[], trail: string[]): boolean => {
            for (const node of Array.isArray(nodes) ? nodes : []) {
                if (!node) { continue; }
                const nodeKey = String(node.id ?? '');
                if (nodeKey === String(key)) {
                    path.push(...trail);
                    return true;
                }
                if (visit(node.children || [], [...trail, nodeKey])) { return true; }
            }
            return false;
        };
        visit(this.items || [], []);
        return path;
    }

    /** `aria-expanded` is only meaningful for branches. */
    rowAriaExpanded(entry: TreeViewItem): string {
        const row = this.currentRow(entry);
        return row?.hasChildren ? String(row.expanded) : '';
    }

    /** The active (focused) row is the only tab stop. */
    tabIndexFor(entry: TreeViewItem): number {
        if (!entry || entry.disabled) {
            return -1;
        }
        return this.activeRow()?.key === entry.key ? 0 : -1;
    }

    /** Selected (or first enabled) row used by the tree's own shortcuts and pickers. */
    activeRow(): TreeViewItem | undefined {
        const rows = this.viewItems;
        if (this._multiple) {
            return rows.find(entry => entry.active)
                ?? rows.find(entry => entry.selected && !entry.disabled)
                ?? rows.find(entry => !entry.disabled);
        }
        if (this._selectionFollowsFocus) {
            return rows.find(entry => entry.selected && !entry.disabled)
                ?? rows.find(entry => !entry.disabled);
        }
        return rows.find(entry => entry.active)
            ?? rows.find(entry => entry.selected && !entry.disabled)
            ?? rows.find(entry => !entry.disabled);
    }

    /** Apply a tree shortcut to the active row without requiring DOM focus. */
    handleKey(key: string, event?: any): boolean {
        const row = this.activeRow();
        if (!row) {
            return false;
        }
        this.onKeydown(row, {
            key,
            preventDefault: event?.preventDefault?.bind(event),
            stopPropagation: event?.stopPropagation?.bind(event)
        });
        return true;
    }

    /** Roving move: updates focus, and selection only when focus follows selection. */
    select(entry: TreeViewItem, event?: Event): void {
        const row = this.currentRow(entry);
        if (!row || row.disabled) {
            return;
        }
        if (this._multiple) {
            this._activeKey = row.key;
            this.focusRow(row);
            return;
        }
        if (this._selectionFollowsFocus) {
            this.selectedId = row.key;
            this.selectAction?.(row.item);
        } else {
            this._activeKey = row.key;
        }
        this.focusRow(row);
    }

    toggleCheckedKey(key: string, node: TreeNode, event?: Event): void {
        event?.stopPropagation?.();
        if (!key || node?.disabled) {
            return;
        }
        const current = new Set((Array.isArray(this.checkedIds) ? this.checkedIds : []).map(String));
        const checking = !current.has(key);
        checking ? current.add(key) : current.delete(key);
        if (this._cascade) {
            const descendants = this.descendantKeys(node);
            descendants.forEach(child => checking ? current.add(child) : current.delete(child));
            const ancestors = this.ancestorKeys(key);
            for (let index = ancestors.length - 1; index >= 0; index--) {
                const parent = this.findNode(ancestors[index]);
                const childKeys = (parent?.children || []).map(child => String(child.id ?? ''));
                if (!childKeys.length) { continue; }
                childKeys.every(child => current.has(child))
                    ? current.add(ancestors[index])
                    : current.delete(ancestors[index]);
            }
        }
        this.checkedIds = [...current];
        this.checkAction?.(this.checkedIds.map(String), node);
    }

    toggleCheck(entry: TreeViewItem, event?: any): void {
        if (event?.type === 'keydown' && !['Enter', ' ', 'Spacebar'].includes(String(event?.key || ''))) {
            return;
        }
        event?.preventDefault?.();
        event?.stopPropagation?.();
        const row = this.currentRow(entry);
        if (row) {
            this.toggleCheckedKey(row.key, row.item, event);
        }
    }

    checkKeydown(entry: TreeViewItem, event: any): void {
        this.toggleCheck(entry, event);
    }

    /** Explicit activation (click/Enter): commits the row regardless of roving mode. */
    activate(entry: TreeViewItem): void {
        const row = this.currentRow(entry);
        if (!row || row.disabled) {
            return;
        }
        this._activeKey = row.key;
        if (this._multiple) {
            this.toggleCheckedKey(row.key, row.item);
            this.focusRow(row);
            return;
        }
        this.selectedId = row.key;
        this.focusRow(row);
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
        const loaded = (row.item.children?.length || 0) > 0 || this.loadedChildren.has(row.key);
        if (next && row.item.lazy && !loaded && this.loadChildren) {
            this.loadLazy(row);
            return;
        }
        if (next) {
            ids.add(row.key);
        } else {
            ids.delete(row.key);
        }
        this.expandedIds = [...ids];
        this.focusRow(row);
        this.toggleAction?.(row.item, next);
    }

    protected async loadLazy(row: TreeViewItem): Promise<void> {
        if (this.loadingKeys.includes(row.key) || !this.loadChildren) {
            return;
        }
        this.loadingKeys = [...this.loadingKeys, row.key];
        try {
            const children = await this.loadChildren(row.item);
            const loaded = Array.isArray(children) ? children : [];
            this.loadedChildren = new Map(this.loadedChildren).set(row.key, loaded);
            const ids = new Set((Array.isArray(this.expandedIds) ? this.expandedIds : []).map(String));
            ids.add(row.key);
            this.expandedIds = [...ids];
            this.toggleAction?.(row.item, true);
        } catch (error) {
            this.loadErrorAction?.(error, row.item);
        } finally {
            this.loadingKeys = this.loadingKeys.filter(key => key !== row.key);
        }
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
            this.activate(row);
            return;
        }
        if (key.length === 1 && !/\s/.test(key) && !event?.ctrlKey && !event?.metaKey && !event?.altKey) {
            const match = this.typeaheadMatch(key, row.index);
            if (match) {
                event?.preventDefault?.();
                this.select(match);
            }
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

    protected typeaheadMatch(key: string, current: number): TreeViewItem | undefined {
        const now = Date.now();
        if (now - this.typeaheadAt > 700) { this.typeaheadBuffer = ''; }
        this.typeaheadAt = now;
        const lower = key.toLocaleLowerCase();
        this.typeaheadBuffer = this.typeaheadBuffer && [...this.typeaheadBuffer].every(ch => ch === lower)
            ? lower
            : `${this.typeaheadBuffer}${lower}`;
        const rows = this.viewItems;
        const find = (query: string): TreeViewItem | undefined => {
            for (let offset = 1; offset <= rows.length; offset++) {
                const index = ((current + offset) % rows.length + rows.length) % rows.length;
                const candidate = rows[index];
                if (candidate && !candidate.disabled && candidate.label.toLocaleLowerCase().startsWith(query)) {
                    return candidate;
                }
            }
            return undefined;
        };
        const match = find(this.typeaheadBuffer);
        if (match || this.typeaheadBuffer === lower) {
            return match;
        }
        this.typeaheadBuffer = lower;
        return find(lower);
    }

    protected currentRow(entry: TreeViewItem): TreeViewItem | undefined {
        return entry ? this.viewItems.find(row => row.key === entry.key) : undefined;
    }

    /** Move selection to the next enabled visible row (clamped, no wrap). */
    protected move(from: number, delta: number): void {
        const rows = this.viewItems;
        if (this._wrapFocus && rows.length) {
            for (let step = 1; step <= rows.length; step++) {
                const index = ((from + delta * step) % rows.length + rows.length) % rows.length;
                if (!rows[index].disabled) {
                    this.select(rows[index]);
                    return;
                }
            }
            return;
        }
        for (let index = from + delta; index >= 0 && index < rows.length; index += delta) {
            if (!rows[index].disabled) {
                this.select(rows[index]);
                return;
            }
        }
    }
}
