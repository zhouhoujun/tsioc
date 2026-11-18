import { Attribute, Component } from '@tsdi/components';
import { normalizeBoolean } from '../../src/ui';

/**
 * Renderer-neutral search/text field with optional leading icon, clear action
 * and Enter submit. The host owns the value binding; every edit notifies
 * `changeAction`, and `v-model`/`:value` can feed the field back in.
 */
@Component({
    selector: 'ui-search-field',
    template: `
    <div class="ui-field ui-search-field {{fieldClass}}">
        <label class="ui-field-label" v-if="label">{{label}}</label>
        <div class="ui-field-row">
            <icon class="ui-field-icon" v-if="icon" [name]="icon" [glyph]="iconGlyph || icon" size="sm"></icon>
            <input class="ui-field-input" type="search"
                [value]="value"
                placeholder="{{placeholder}}"
                [disabled]="disabled"
                [readOnly]="readonly"
                aria-label="{{ariaLabel || label || placeholder}}"
                @input="onInput($event)"
                @keydown="onKeydown($event)" />
            <button class="ui-field-clear" type="button" v-if="clearable && value"
                aria-label="{{clearLabel}}" @click="clear">{{clearGlyph}}</button>
        </div>
        <span class="ui-field-hint" v-if="hint">{{hint}}</span>
    </div>`
})
export class SearchFieldComponent {
    @Attribute() value = '';
    @Attribute() label = '';
    @Attribute() placeholder = '';
    @Attribute() hint = '';
    @Attribute() icon = 'search';
    @Attribute() iconGlyph = '';
    @Attribute() ariaLabel = '';
    @Attribute() clearLabel = 'Clear';
    @Attribute() className = '';
    @Attribute() changeAction?: (value: string) => void;
    @Attribute() submitAction?: (value: string) => void;
    @Attribute() clearAction?: () => void;

    private _clearable = true;
    private _disabled = false;
    private _readonly = false;

    @Attribute()
    get clearable(): boolean { return this._clearable; }
    set clearable(value: boolean | string) { this._clearable = normalizeBoolean(value, true); }

    @Attribute()
    get disabled(): boolean { return this._disabled; }
    set disabled(value: boolean | string) { this._disabled = normalizeBoolean(value); }

    @Attribute()
    get readonly(): boolean { return this._readonly; }
    set readonly(value: boolean | string) { this._readonly = normalizeBoolean(value); }

    get clearGlyph(): string {
        return '✕';
    }

    get fieldClass(): string {
        return [
            this._disabled ? 'is-disabled' : '',
            this._readonly ? 'is-readonly' : '',
            this.className
        ].filter(Boolean).join(' ');
    }

    onInput(event: any): void {
        this.value = String(event?.target?.value ?? '');
        this.changeAction?.(this.value);
    }

    onKeydown(event: any): void {
        if (event?.key === 'Enter') {
            event?.preventDefault?.();
            this.submitAction?.(this.value);
            return;
        }
        if (event?.key === 'Escape' && this._clearable) {
            event?.preventDefault?.();
            this.clear();
        }
    }

    clear(): void {
        if (this._disabled || this._readonly) {
            return;
        }
        this.value = '';
        this.changeAction?.('');
        this.clearAction?.();
    }
}
