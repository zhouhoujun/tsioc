import { Attribute, Component, ElementRef } from '@tsdi/components';
import { Optional } from '@tsdi/ioc';
import { markElementRefRaw } from '../../src/raw-element';
import { normalizeBoolean } from '../../src/ui';
import { SelectionCore } from '../../src/selection-core';
import { installCascaderStyles } from './cascader.styles';

export interface CascaderOption {
    label: string;
    value: string;
    children?: CascaderOption[];
    disabled?: boolean;
}

interface CascaderViewOption {
    key: string;
    value: string;
    label: string;
    disabled: boolean;
    selected: boolean;
    expanded: boolean;
    hasChildren: boolean;
    className: string;
}

interface CascaderColumn {
    key: string;
    level: number;
    title: string;
    options: CascaderViewOption[];
}

/**
 * Hierarchical path picker (Ant Design Cascader).
 *
 * Browsers show one column per level; terminal hosts stack the same columns
 * with their titles. Choosing a branch keeps the panel open and appends a
 * column; choosing a leaf commits the path and emits `changeAction(path, nodes)`.
 */
@Component({
    selector: 'ui-cascader',
    template: `
    <div class="ui-cascader {{cascadeClass}}" role="combobox"
        aria-label="{{ariaLabel}}" aria-haspopup="listbox" aria-expanded="{{openState}}"
        tabindex="{{disabled ? -1 : 0}}" focusable="{{!disabled}}"
        @keydown="onKeydown($event)">
        <span class="ui-cascader-trigger" @click="toggle">
            <span class="ui-cascader-value" v-if="displayLabel">{{displayLabel}}</span>
            <span class="ui-cascader-value is-placeholder" v-else>{{placeholder}}</span>
            <span class="ui-cascader-caret" aria-hidden="true">{{openState ? '▾' : '▸'}}</span>
        </span>
        <div class="ui-cascader-panel" role="listbox" v-if="openState">
            <div class="ui-cascader-column" v-for="column in columns" trackBy="key">
                <span class="ui-cascader-column-title">{{column.title}}</span>
                <span class="{{option.className}}" role="option"
                    aria-selected="{{option.selected}}" aria-disabled="{{option.disabled}}"
                    tabindex="{{optionTabIndex(column.level, option)}}" focusable="{{!option.disabled}}"
                    v-for="option in column.options" trackBy="key"
                    @click="choose(column.level, option)"
                    @keydown="onOptionKeydown($event, column, option)">
                    <span class="ui-cascader-option-label">{{option.label}}</span><span class="ui-cascader-option-caret" v-if="option.hasChildren" aria-hidden="true">{{option.expanded ? '▾' : '▸'}}</span>
                </span>
            </div>
        </div>
    </div>`
})
export class CascaderComponent {
    constructor(@Optional() protected elementRef?: ElementRef) {
        markElementRefRaw(elementRef);
    }

    onInit(): void {
        installCascaderStyles((this.elementRef?.nativeElement as { ownerDocument?: Document } | undefined)?.ownerDocument);
    }

    @Attribute() options: CascaderOption[] = [];
    @Attribute() placeholder = 'Select…';
    @Attribute() ariaLabel = 'Cascader';
    @Attribute() className = '';
    @Attribute() changeAction?: (path: string[], nodes: CascaderOption[]) => void;

    private readonly selection = new SelectionCore();
    private _open = false;
    private _disabled = false;
    private _value: string[] = [];
    private browsing: string[] = [];

    @Attribute()
    get value(): string[] { return this._value; }
    set value(value: string[] | string) {
        const next = Array.isArray(value) ? value.map(String) : [];
        const changed = next.length !== this._value.length
            || next.some((entry, index) => entry !== this._value[index]);
        this._value = next;
        if (changed) {
            this.browsing = [...next];
        }
    }

    @Attribute()
    get disabled(): boolean { return this._disabled; }
    set disabled(value: boolean | string) { this._disabled = normalizeBoolean(value); }

    get openState(): boolean {
        return this._open && !this._disabled;
    }

    get cascadeClass(): string {
        return [this.openState ? 'is-open' : '', this.className].filter(Boolean).join(' ');
    }

    get displayLabel(): string {
        return this.nodesFor(this._value).map(node => String(node.label ?? '')).join(' / ');
    }

    get columns(): CascaderColumn[] {
        const columns: CascaderColumn[] = [];
        let levelOptions = Array.isArray(this.options) ? this.options : [];
        let level = 0;
        while (levelOptions.length) {
            const prefix = this.browsing.slice(0, level);
            columns.push({
                key: `level-${level}`,
                level,
                title: level === 0 ? this.ariaLabel : this.labelAt(prefix),
                options: levelOptions.map((option, index) => {
                    const path = [...prefix, String(option.value)];
                    return {
                        key: `${level}-${index}-${option.value}`,
                        value: String(option.value),
                        label: String(option.label ?? option.value),
                        disabled: option.disabled === true,
                        selected: this._value[level] === String(option.value),
                        expanded: this.browsing[level] === String(option.value),
                        hasChildren: Array.isArray(option.children) && option.children.length > 0,
                        className: [
                            'ui-cascader-option',
                            this.activeValueAt(level) === String(option.value) ? 'is-active' : '',
                            option.disabled ? 'is-disabled' : ''
                        ].filter(Boolean).join(' ')
                    } as CascaderViewOption;
                })
            });
            const branch = this.nodesFor(this.browsing)[level];
            levelOptions = branch && Array.isArray(branch.children) ? branch.children : [];
            level += 1;
        }
        return columns;
    }

    toggle(): void {
        this._open ? this.close() : this.open();
    }

    open(): void {
        if (this._disabled || this._open) {
            return;
        }
        this.browsing = [...this._value];
        this._open = true;
    }

    close(): void {
        if (!this._open) {
            return;
        }
        this._open = false;
        this.focusTrigger();
    }

    choose(level: number, option: CascaderViewOption): void {
        if (this._disabled || option.disabled) {
            return;
        }
        const prefix = this.browsing.slice(0, level);
        const path = [...prefix, option.value];
        if (option.hasChildren) {
            this.browsing = path;
            return;
        }
        this.commit(path);
    }

    onKeydown(event: any): void {
        if (this._disabled) {
            return;
        }
        const key = String(event?.key || '');
        if (key === 'Escape' && this._open) {
            event.preventDefault?.();
            event.stopPropagation?.();
            this.close();
            return;
        }
        if (!this._open) {
            if (key === 'Enter' || key === ' ' || key === 'Spacebar' || key === 'ArrowDown') {
                event.preventDefault?.();
                this.open();
            }
            return;
        }
        if (key === 'ArrowDown' || key === 'ArrowUp') {
            event.preventDefault?.();
            this.moveActive(key === 'ArrowDown' ? 1 : -1);
            return;
        }
        if (key === 'Home' || key === 'End') {
            event.preventDefault?.();
            this.moveToEdge(key === 'End');
            return;
        }
        if (key === 'ArrowRight') {
            event.preventDefault?.();
            this.expandActive();
            return;
        }
        if (key === 'ArrowLeft') {
            event.preventDefault?.();
            this.collapseActive();
            return;
        }
        if (key === 'Enter' || key === ' ' || key === 'Spacebar') {
            event.preventDefault?.();
            this.activateActive();
        }
    }

    onOptionKeydown(event: any, column: CascaderColumn, option: CascaderViewOption): void {
        if (event?.key === 'Enter' || event?.key === ' ' || event?.key === 'Spacebar') {
            event.preventDefault?.();
            this.choose(column.level, option);
        }
    }

    optionTabIndex(level: number, option: CascaderViewOption): number {
        return !option.disabled && this.activeValueAt(level) === option.value ? 0 : -1;
    }

    protected activeLevel(): number {
        return this.browsing.length ? this.browsing.length - 1 : 0;
    }

    protected activeValueAt(level: number): string {
        const current = this.browsing[level];
        if (current != null) {
            return String(current);
        }
        if (level === 0) {
            const first = this.levelNodes(0).find(option => !option.disabled);
            return first ? String(first.value) : '';
        }
        return '';
    }

    protected levelNodes(level: number): CascaderOption[] {
        if (level <= 0) {
            return Array.isArray(this.options) ? this.options : [];
        }
        const prefix = this.browsing.slice(0, level);
        return this.nodesFor(prefix)[level - 1]?.children || [];
    }

    protected activeNode(): { level: number; option: CascaderOption } | undefined {
        const level = this.activeLevel();
        const option = this.levelNodes(level).find(entry => String(entry.value) === this.activeValueAt(level));
        return option ? { level, option } : undefined;
    }

    protected setActive(level: number, value: string): void {
        const path = this.browsing.slice(0, level);
        path[level] = String(value);
        this.browsing = path;
    }

    protected moveActive(delta: number): void {
        const level = this.activeLevel();
        const nodes = this.levelNodes(level);
        const current = nodes.findIndex(option => String(option.value) === this.activeValueAt(level));
        const next = this.selection.move(nodes, current, delta);
        if (next >= 0) {
            this.setActive(level, String(nodes[next].value));
        }
    }

    protected moveToEdge(last: boolean): void {
        const level = this.activeLevel();
        const nodes = this.levelNodes(level);
        const next = last ? this.selection.last(nodes) : this.selection.first(nodes);
        if (next >= 0) {
            this.setActive(level, String(nodes[next].value));
        }
    }

    protected expandActive(): void {
        const active = this.activeNode();
        if (!active || active.option.disabled) {
            return;
        }
        const { level, option } = active;
        const children = Array.isArray(option.children) ? option.children : [];
        if (!children.length) {
            return;
        }
        if (this.browsing.length > level) {
            const child = this.selection.first(children);
            if (child >= 0) {
                this.setActive(level + 1, String(children[child].value));
            }
            return;
        }
        this.setActive(level, String(option.value));
    }

    protected collapseActive(): void {
        if (!this.browsing.length) {
            this.close();
            return;
        }
        this.browsing = this.browsing.slice(0, -1);
    }

    protected activateActive(): void {
        const active = this.activeNode();
        if (!active || active.option.disabled) {
            return;
        }
        const { level, option } = active;
        const path = [...this.browsing.slice(0, level), String(option.value)];
        if (Array.isArray(option.children) && option.children.length) {
            this.browsing = path;
            return;
        }
        this.commit(path);
    }

    protected commit(path: string[]): void {
        this.changeAction?.(path, this.nodesFor(path));
        this._value = path;
        this.browsing = path;
        this._open = false;
        this.focusTrigger();
    }

    protected focusTrigger(): void {
        void Promise.resolve().then(() => Promise.resolve()).then(() => {
            const host = this.elementRef?.nativeElement as any;
            const root = host?.matches?.('.ui-cascader') ? host : host?.querySelector?.('.ui-cascader');
            root?.focus?.();
        });
    }

    protected labelAt(prefix: string[]): string {
        const nodes = this.nodesFor(prefix);
        return String(nodes[nodes.length - 1]?.label ?? '');
    }

    protected nodesFor(path: string[]): CascaderOption[] {
        const nodes: CascaderOption[] = [];
        let level: CascaderOption[] = Array.isArray(this.options) ? this.options : [];
        for (const value of path) {
            const match = level.find(option => String(option.value) === String(value));
            if (!match) {
                break;
            }
            nodes.push(match);
            level = Array.isArray(match.children) ? match.children : [];
        }
        return nodes;
    }
}
