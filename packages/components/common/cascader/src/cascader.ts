import { Attribute, Component, ElementRef } from '@tsdi/components';
import { Optional } from '@tsdi/ioc';
import { markElementRefRaw } from '../../src/raw-element';
import { normalizeBoolean } from '../../src/ui';
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
                    tabindex="0" focusable="{{!option.disabled}}"
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

    private _open = false;
    private _disabled = false;
    private _value: string[] = [];
    private browsing: string[] = [];

    @Attribute()
    get value(): string[] { return this._value; }
    set value(value: string[] | string) {
        this._value = Array.isArray(value) ? value.map(String) : [];
        this.browsing = [...this._value];
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
                            this.browsing[level] === String(option.value) ? 'is-active' : '',
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
        if (this._disabled) {
            return;
        }
        if (!this._open) {
            this.browsing = [...this._value];
        }
        this._open = !this._open;
    }

    choose(level: number, option: CascaderViewOption): void {
        if (this._disabled || option.disabled) {
            return;
        }
        const prefix = this.browsing.slice(0, level);
        const path = [...prefix, option.value];
        this.browsing = path;
        if (option.hasChildren) {
            return;
        }
        this.changeAction?.(path, this.nodesFor(path));
        this._value = path;
        this.browsing = path;
        this._open = false;
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
            this.browsing = [...this._value];
            this._open = true;
        }
    }

    onOptionKeydown(event: any, column: CascaderColumn, option: CascaderViewOption): void {
        if (event?.key === 'Enter' || event?.key === ' ' || event?.key === 'Spacebar') {
            event.preventDefault?.();
            this.choose(column.level, option);
        }
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
