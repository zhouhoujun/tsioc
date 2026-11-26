import { Attribute, Component, ElementRef } from '@tsdi/components';
import { Optional } from '@tsdi/ioc';
import { markElementRefRaw } from '../../src/raw-element';
import { nextUiId, normalizeBoolean } from '../../src/ui';
import { installAutocompleteStyles } from './autocomplete.styles';

export type AutoCompleteOptionLoader = (query: string) => AutoCompleteOption[] | Promise<AutoCompleteOption[]>;

export interface AutoCompleteOption {
    label: string;
    value: string;
    description?: string;
    disabled?: boolean;
    /** Optional group header shown before the first option of the group. */
    group?: string;
}

interface AutoCompleteViewOption {
    index: number;
    value: string;
    label: string;
    description: string;
    disabled: boolean;
    group: string;
    showGroup: boolean;
    className: string;
}

/**
 * Combobox with host-filtered suggestions (Ant Design AutoComplete).
 *
 * The host owns filtering: typing emits `changeAction(value)` and a new
 * `options` list. Arrow keys move the active option, Enter selects, Escape
 * closes. The same input/panel works in browsers and terminal hosts.
 */
@Component({
    selector: 'ui-autocomplete',
    template: `
    <div class="ui-autocomplete {{autoClass}}">
        <div class="ui-autocomplete-values" role="list" v-if="multiple && selectedItems.length">
            <span class="ui-autocomplete-value" role="listitem"
                v-for="item in selectedItems" trackBy="value">
                <span class="ui-autocomplete-value-label">{{item.label}}</span>
                <button class="ui-autocomplete-value-remove" type="button" data-plain="true"
                    aria-label="{{removeLabel}}" [disabled]="disabled"
                    @click="removeValue(item.value)">✕</button>
            </span>
        </div>
        <input class="ui-autocomplete-input" type="text" role="combobox"
            aria-autocomplete="list" aria-expanded="{{openState}}"
            aria-controls="{{listId}}" aria-activedescendant="{{activeId}}"
            aria-label="{{ariaLabel}}" aria-disabled="{{disabled}}" autocomplete="off"
            [value]="value" placeholder="{{placeholder}}" [disabled]="disabled"
            @input="onInput($event)" @focus="onFocus()" @blur="onBlur()"
            @keydown="onKeydown($event)" />
        <div class="ui-autocomplete-panel" id="{{listId}}" role="listbox"
            aria-multiselectable="{{multiple}}" v-if="panelVisible">
            <span class="ui-autocomplete-loading" role="status" v-if="loading">{{loadingLabel}}</span>
            <span class="ui-autocomplete-error" role="alert" v-else-if="loadError">{{loadError}}</span>
            <div class="ui-autocomplete-row" role="presentation"
                v-for="option in viewOptions" trackBy="index" v-if="!loading">
                <span class="ui-autocomplete-group" role="presentation" v-if="option.showGroup">{{option.group}}</span>
                <span class="{{option.className}}" role="option"
                    id="{{optionId(option.index)}}"
                    aria-selected="{{optionSelected(option)}}"
                    aria-disabled="{{option.disabled}}"
                    @mousedown="keepFocus($event)" @click="choose(option)"
                    @keydown="onOptionKeydown(option, $event)">
                    <span class="ui-autocomplete-label">{{option.label}}</span><span class="ui-autocomplete-description" v-if="option.description"> {{option.description}}</span>
                </span>
            </div>
            <span class="ui-autocomplete-empty" v-if="!loading && !loadError && !viewOptions.length">{{emptyLabel}}</span>
        </div>
    </div>`
})
export class AutoCompleteComponent {
    constructor(@Optional() protected elementRef?: ElementRef) {
        markElementRefRaw(elementRef);
    }

    onInit(): void {
        installAutocompleteStyles((this.elementRef?.nativeElement as { ownerDocument?: Document } | undefined)?.ownerDocument);
    }

    @Attribute() value = '';
    @Attribute() options: AutoCompleteOption[] = [];
    @Attribute() placeholder = '';
    @Attribute() emptyLabel = 'No suggestions';
    @Attribute() removeLabel = 'Remove';
    @Attribute() ariaLabel = 'Search';
    @Attribute() className = '';
    @Attribute() loadingLabel = 'Loading…';
    @Attribute() changeAction?: (value: string) => void;
    @Attribute() selectAction?: (value: string) => void;
    @Attribute() removeAction?: (value: string) => void;
    /** Selected values for multi mode; the host owns the array. */
    @Attribute() values: string[] = [];
    /** Host-provided async option source; replaces `options` while active. */
    @Attribute() loadOptions?: AutoCompleteOptionLoader;

    private _disabled = false;
    private _multiple = false;
    private _loadedOptions?: AutoCompleteOption[];
    private loadSequence = 0;
    loadError = '';
    @Attribute()
    get disabled(): boolean { return this._disabled; }
    set disabled(value: boolean | string) { this._disabled = normalizeBoolean(value); }

    @Attribute()
    get multiple(): boolean { return this._multiple; }
    set multiple(value: boolean | string) { this._multiple = normalizeBoolean(value); }

    get selectedItems(): Array<{ value: string; label: string }> {
        const source = this.loadOptions ? (this._loadedOptions || []) : this.options;
        return (this.values || []).map(value => {
            const option = (source || []).find(item => String(item?.value) === String(value));
            return { value: String(value), label: String(option?.label ?? value) };
        });
    }

    optionSelected(option: AutoCompleteViewOption): boolean {
        if (this._multiple) {
            return (this.values || []).some(value => String(value) === option.value);
        }
        return option.index === this.currentIndex;
    }

    removeValue(value: string): void {
        if (this._disabled) {
            return;
        }
        this.removeAction?.(String(value));
    }

    protected readonly uid = nextUiId('ui-autocomplete');
    private _open = false;
    private _loading = false;
    private selectedIndex = 0;

    @Attribute()
    get open(): boolean { return this._open; }
    set open(value: boolean | string) { this._open = normalizeBoolean(value); }

    @Attribute()
    get loading(): boolean { return this._loading; }
    set loading(value: boolean | string) { this._loading = normalizeBoolean(value); }

    @Attribute()
    get selected(): number { return this.selectedIndex; }
    set selected(value: number | string) {
        const next = Math.floor(Number(value));
        this.selectedIndex = Number.isFinite(next) && next >= 0 ? next : 0;
    }

    get listId(): string {
        return `${this.uid}-list`;
    }

    get openState(): boolean {
        return this._open && !this._loading;
    }

    get panelVisible(): boolean {
        return this._open;
    }

    get autoClass(): string {
        return [this.openState ? 'is-open' : '', this.className].filter(Boolean).join(' ');
    }

    get currentIndex(): number {
        const options = this.viewOptions;
        if (!options.length) {
            return -1;
        }
        const enabled = options.find(option => !option.disabled);
        if (!enabled) {
            return -1;
        }
        const current = options[this.selectedIndex];
        return current && !current.disabled ? this.selectedIndex : enabled.index;
    }

    get activeId(): string {
        const index = this.currentIndex;
        return this.openState && index >= 0 ? this.optionId(index) : '';
    }

    get viewOptions(): AutoCompleteViewOption[] {
        const source = this.loadOptions ? (this._loadedOptions || []) : this.options;
        let previousGroup = '';
        return (Array.isArray(source) ? source : []).map((option, index) => {
            const group = String(option?.group ?? '');
            const showGroup = !!group && group !== previousGroup;
            previousGroup = group;
            return {
                index,
                value: String(option?.value ?? ''),
                label: String(option?.label ?? option?.value ?? ''),
                description: String(option?.description ?? ''),
                disabled: option?.disabled === true,
                group,
                showGroup,
                className: [
                    'ui-autocomplete-option',
                    index === this.selectedIndex ? 'is-active' : '',
                    option?.disabled ? 'is-disabled' : ''
                ].filter(Boolean).join(' ')
            };
        });
    }

    optionId(index: number): string {
        return `${this.uid}-option-${index}`;
    }

    onInput(event: any): void {
        if (this._disabled) {
            return;
        }
        this.value = String(event?.target?.value ?? '');
        this.selectedIndex = 0;
        this._open = true;
        this.changeAction?.(this.value);
        void this.reloadOptions(this.value);
    }

    onFocus(): void {
        if (this._disabled) {
            return;
        }
        if (this.loadOptions && this._loadedOptions === undefined) {
            void this.reloadOptions(this.value);
            return;
        }
        if (this.viewOptions.length) {
            this._open = true;
        }
    }

    protected async reloadOptions(query: string): Promise<void> {
        if (!this.loadOptions) {
            return;
        }
        const sequence = ++this.loadSequence;
        this._loading = true;
        this._open = true;
        this.loadError = '';
        try {
            const next = await this.loadOptions(query);
            if (sequence !== this.loadSequence) {
                return;
            }
            this._loadedOptions = Array.isArray(next) ? next : [];
            this.selectedIndex = 0;
        } catch (error) {
            if (sequence !== this.loadSequence) {
                return;
            }
            this._loadedOptions = [];
            this.loadError = (error as Error)?.message || String(error);
        } finally {
            if (sequence === this.loadSequence) {
                this._loading = false;
            }
        }
    }

    onBlur(): void {
        this._open = false;
    }

    keepFocus(event?: Event): void {
        event?.preventDefault?.();
    }

    choose(option: AutoCompleteViewOption): void {
        if (this._disabled || !option || option.disabled) {
            return;
        }
        if (this._multiple) {
            const selected = (this.values || []).some(value => String(value) === option.value);
            if (selected) {
                this.removeAction?.(option.value);
            } else {
                this.selectAction?.(option.value);
            }
            this.selectedIndex = option.index;
            return;
        }
        this.value = option.value;
        this._open = false;
        this.changeAction?.(option.value);
        this.selectAction?.(option.value);
    }

    onKeydown(event: any): void {
        if (this._disabled) {
            return;
        }
        const key = String(event?.key || '');
        if (key === 'Escape') {
            this._open = false;
            return;
        }
        if (key === 'ArrowDown' || key === 'ArrowUp') {
            event.preventDefault?.();
            this.move(key === 'ArrowDown' ? 1 : -1);
            return;
        }
        if (key === 'Enter') {
            const option = this.viewOptions[this.currentIndex];
            if (option) {
                event.preventDefault?.();
                this.choose(option);
            }
        }
    }

    onOptionKeydown(option: AutoCompleteViewOption, event: any): void {
        if (event?.key === 'Enter' || event?.key === ' ' || event?.key === 'Spacebar') {
            event.preventDefault?.();
            this.choose(option);
        }
    }

    protected move(delta: number): void {
        const options = this.viewOptions;
        if (!options.length) {
            return;
        }
        let index = this.currentIndex;
        for (let step = 1; step <= options.length; step++) {
            const next = ((index + delta * step) % options.length + options.length) % options.length;
            if (!options[next].disabled) {
                this.selectedIndex = next;
                this._open = true;
                return;
            }
        }
    }
}
