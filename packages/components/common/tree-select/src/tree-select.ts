import { Attribute, Component, ElementRef, ViewChild } from '@tsdi/components';
import { Optional } from '@tsdi/ioc';
import { markElementRefRaw } from '../../src/raw-element';
import { normalizeBoolean } from '../../src/ui';
import { TreeComponent } from '../../tree/src/tree';
import { TreeNode } from '../../tree/src/tree';
import { installTreeSelectStyles } from './tree-select.styles';

/**
 * Tree-backed single selection field (Ant Design TreeSelect).
 *
 * The trigger and panel are renderer-neutral: browsers position the tree panel
 * under the trigger, terminal hosts paint it inline. Keyboard: Enter/Space or
 * ArrowDown opens, Escape closes; the embedded tree keeps its own roving focus.
 */
@Component({
    selector: 'ui-tree-select',
    imports: [TreeComponent],
    template: `
    <div class="ui-tree-select {{selectClass}}" role="combobox"
        aria-label="{{ariaLabel}}" aria-haspopup="tree" aria-expanded="{{openState}}"
        aria-disabled="{{disabled}}"
        tabindex="{{disabled ? -1 : 0}}" focusable="{{!disabled}}"
        @keydown="onKeydown($event)">
        <span class="ui-tree-select-trigger" @click="toggle()">
            <span class="ui-tree-select-value" v-if="displayLabel">{{displayLabel}}</span>
            <span class="ui-tree-select-value is-placeholder" v-else>{{placeholder}}</span>
            <span class="ui-tree-select-caret" aria-hidden="true">{{openState ? '▾' : '▸'}}</span>
        </span>
        <div class="ui-tree-select-panel" v-if="openState">
            <ui-tree :items="items" :expandedIds="expandedKeys" :selectedId="selectedKey"
                :ariaLabel="ariaLabel" :checkable="checkable" :multiple="multiple"
                :checkedIds="checkedIds" :checkAction="treeCheckHandler" :loadChildren="loadChildren"
                :selectionFollowsFocus="false" :wrapFocus="true" :selectAction="treeSelectHandler"
                :toggleAction="treeToggleHandler"></ui-tree>
        </div>
    </div>`
})
export class TreeSelectComponent {
    constructor(@Optional() protected elementRef?: ElementRef) {
        markElementRefRaw(elementRef);
    }

    onInit(): void {
        installTreeSelectStyles((this.elementRef?.nativeElement as { ownerDocument?: Document } | undefined)?.ownerDocument);
    }

    @ViewChild(TreeComponent) tree?: TreeComponent;

    @Attribute() items: TreeNode[] = [];
    @Attribute() selectedId = '';
    @Attribute() expandedIds: string[] = [];
    @Attribute() placeholder = 'Select…';
    @Attribute() ariaLabel = 'Tree select';
    @Attribute() className = '';
    @Attribute() changeAction?: (node: TreeNode) => void;
    @Attribute() checkAction?: (keys: string[], node: TreeNode) => void;
    @Attribute() loadChildren?: (node: TreeNode) => TreeNode[] | Promise<TreeNode[]>;
    @Attribute() checkedIds: Array<string | number> = [];

    private _open = false;
    private _disabled = false;
    private _multiple = false;
    private _checkable = false;
    private selected = '';

    @Attribute()
    get disabled(): boolean { return this._disabled; }
    set disabled(value: boolean | string) { this._disabled = normalizeBoolean(value); }

    @Attribute()
    get multiple(): boolean { return this._multiple; }
    set multiple(value: boolean | string) { this._multiple = normalizeBoolean(value); }

    @Attribute()
    get checkable(): boolean { return this._checkable; }
    set checkable(value: boolean | string) { this._checkable = normalizeBoolean(value); }

    get selectedKey(): string {
        return this.selected || String(this.selectedId || '');
    }

    get expandedKeys(): string[] {
        return Array.isArray(this.expandedIds) ? this.expandedIds : [];
    }

    get openState(): boolean {
        return this._open && !this._disabled;
    }

    get selectClass(): string {
        return [
            this.openState ? 'is-open' : '',
            this._disabled ? 'is-disabled' : '',
            this.className
        ].filter(Boolean).join(' ');
    }

    get displayLabel(): string {
        if (this._multiple) {
            return (this.checkedIds || [])
                .map(key => this.findLabel(this.items, String(key)))
                .filter(Boolean)
                .join(', ');
        }
        return this.findLabel(this.items, this.selectedKey);
    }

    get treeSelectHandler(): (node: TreeNode) => void {
        return node => {
            if (!this._multiple) {
                this.choose(node);
            }
        };
    }

    get treeCheckHandler(): (keys: string[], node: TreeNode) => void {
        return (keys, node) => this.checkAction?.(keys, node);
    }

    get treeToggleHandler(): (node: TreeNode, expanded: boolean) => void {
        return (node, expanded) => this.toggleNode(node, expanded);
    }

    toggle(): void {
        if (this._disabled) {
            return;
        }
        this._open ? this.close() : this.open();
    }

    open(): void {
        if (this._disabled || this._open) {
            return;
        }
        this._open = true;
    }

    close(): void {
        if (!this._open) {
            return;
        }
        this._open = false;
        this.focusTrigger();
    }

    choose(node: TreeNode): void {
        if (this._disabled || !node) {
            return;
        }
        this.selected = String(node.id ?? '');
        this._open = false;
        this.focusTrigger();
        this.changeAction?.(node);
    }

    onKeydown(event: any): void {
        if (this._disabled) {
            return;
        }
        if (event?.key === 'Escape' && this._open) {
            event.preventDefault?.();
            event.stopPropagation?.();
            this.close();
            return;
        }
        if (!this._open) {
            if (event?.key === 'Enter' || event?.key === ' ' || event?.key === 'Spacebar'
                || event?.key === 'ArrowDown') {
                event.preventDefault?.();
                this.open();
            }
            return;
        }
        if (['ArrowDown', 'ArrowUp', 'Home', 'End', 'ArrowRight', 'ArrowLeft'].includes(String(event?.key || ''))) {
            event.preventDefault?.();
            event.stopPropagation?.();
            this.tree?.handleKey(String(event.key), event);
        } else if (event?.key === 'Enter' || event?.key === ' ' || event?.key === 'Spacebar') {
            event.preventDefault?.();
            event.stopPropagation?.();
            this.tree?.handleKey('Enter', event);
        }
    }

    protected focusTrigger(): void {
        // Closing removes the panel and can replace the trigger node; refocus the
        // current root after the structural update settles.
        void Promise.resolve().then(() => Promise.resolve()).then(() => {
            const host = this.elementRef?.nativeElement as any;
            const root = host?.matches?.('.ui-tree-select') ? host : host?.querySelector?.('.ui-tree-select');
            root?.focus?.();
        });
    }

    protected toggleNode(node: TreeNode, expanded: boolean): void {
        const key = String(node?.id ?? '');
        if (!key) {
            return;
        }
        const keys = new Set(this.expandedKeys.map(String));
        expanded ? keys.add(key) : keys.delete(key);
        this.expandedIds = [...keys];
    }

    protected findLabel(nodes: TreeNode[], key: string): string {
        if (!key) {
            return '';
        }
        for (const node of Array.isArray(nodes) ? nodes : []) {
            if (!node) {
                continue;
            }
            if (String(node.id ?? '') === key) {
                return String(node.label ?? '');
            }
            const child = this.findLabel(node.children || [], key);
            if (child) {
                return child;
            }
        }
        return '';
    }
}
