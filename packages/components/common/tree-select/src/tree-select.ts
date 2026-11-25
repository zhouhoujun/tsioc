import { Attribute, Component, ElementRef } from '@tsdi/components';
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
                :ariaLabel="ariaLabel" :selectAction="treeSelectHandler"
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

    @Attribute() items: TreeNode[] = [];
    @Attribute() selectedId = '';
    @Attribute() expandedIds: string[] = [];
    @Attribute() placeholder = 'Select…';
    @Attribute() ariaLabel = 'Tree select';
    @Attribute() className = '';
    @Attribute() changeAction?: (node: TreeNode) => void;

    private _open = false;
    private _disabled = false;
    private selected = '';

    @Attribute()
    get disabled(): boolean { return this._disabled; }
    set disabled(value: boolean | string) { this._disabled = normalizeBoolean(value); }

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
        return this.findLabel(this.items, this.selectedKey);
    }

    get treeSelectHandler(): (node: TreeNode) => void {
        return node => this.choose(node);
    }

    get treeToggleHandler(): (node: TreeNode, expanded: boolean) => void {
        return (node, expanded) => this.toggleNode(node, expanded);
    }

    toggle(): void {
        if (this._disabled) {
            return;
        }
        this._open = !this._open;
    }

    choose(node: TreeNode): void {
        if (this._disabled || !node) {
            return;
        }
        this.selected = String(node.id ?? '');
        this._open = false;
        this.changeAction?.(node);
    }

    onKeydown(event: any): void {
        if (this._disabled) {
            return;
        }
        if (event?.key === 'Escape' && this._open) {
            event.preventDefault?.();
            event.stopPropagation?.();
            this._open = false;
            return;
        }
        if ((event?.key === 'Enter' || event?.key === ' ' || event?.key === 'Spacebar'
            || event?.key === 'ArrowDown') && !this._open) {
            event.preventDefault?.();
            this._open = true;
        }
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
