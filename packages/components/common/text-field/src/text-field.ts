import { Attribute, Component } from '@tsdi/components';
import { normalizeBoolean } from '../../src/ui';

export type TextFieldType =
    | 'text' | 'password' | 'email' | 'url' | 'tel' | 'search'
    | 'number' | 'date' | 'time' | 'month' | 'week' | 'color';

/**
 * Renderer-neutral text field with optional multiline mode, clear button and
 * Enter submit. Native inputs are used so both DOM and terminal hosts render the
 * current value; `changeAction` keeps host state in sync.
 */
@Component({
    selector: 'ui-text-field',
    template: `
    <div class="ui-field ui-text-field {{fieldClass}}">
        <label class="ui-field-label" v-if="label">{{label}}<span class="ui-field-required" v-if="required">*</span></label>
        <div class="ui-field-row">
            <input class="ui-field-input" v-if="!multiline"
                type="{{htmlType}}"
                [value]="value"
                placeholder="{{placeholder}}"
                [disabled]="disabled"
                [readOnly]="readonly"
                aria-label="{{ariaLabel || label || placeholder}}"
                aria-required="{{required}}"
                aria-invalid="{{!!error}}"
                @input="onInput($event)"
                @keydown="onKeydown($event)"
                @blur="onBlur()" />
            <textarea class="ui-field-input ui-field-textarea" v-if="multiline"
                [value]="value"
                rows="{{rows}}"
                placeholder="{{placeholder}}"
                [disabled]="disabled"
                [readOnly]="readonly"
                aria-label="{{ariaLabel || label || placeholder}}"
                aria-required="{{required}}"
                aria-invalid="{{!!error}}"
                @input="onInput($event)"
                @keydown="onKeydown($event)"
                @blur="onBlur()"></textarea>
            <button class="ui-field-clear" type="button" v-if="clearable && value"
                aria-label="{{clearLabel}}" @click="clear">{{clearGlyph}}</button>
        </div>
        <span class="ui-field-hint" v-if="hint">{{hint}}</span>
        <span class="ui-field-error" v-if="error">{{error}}</span>
    </div>`
})
export class TextFieldComponent {
    @Attribute() value = '';
    @Attribute() type: TextFieldType = 'text';
    @Attribute() label = '';
    @Attribute() placeholder = '';
    @Attribute() hint = '';
    @Attribute() error = '';
    @Attribute() ariaLabel = '';
    @Attribute() rows = 3;
    @Attribute() clearLabel = 'Clear';
    @Attribute() className = '';
    @Attribute() changeAction?: (value: string) => void;
    @Attribute() submitAction?: (value: string) => void;
    @Attribute() blurAction?: () => void;
    @Attribute() clearAction?: () => void;

    private _multiline = false;
    private _required = false;
    private _disabled = false;
    private _readonly = false;
    private _clearable = false;

    @Attribute()
    get multiline(): boolean { return this._multiline; }
    set multiline(value: boolean | string) { this._multiline = normalizeBoolean(value); }

    @Attribute()
    get required(): boolean { return this._required; }
    set required(value: boolean | string) { this._required = normalizeBoolean(value); }

    @Attribute()
    get disabled(): boolean { return this._disabled; }
    set disabled(value: boolean | string) { this._disabled = normalizeBoolean(value); }

    @Attribute()
    get readonly(): boolean { return this._readonly; }
    set readonly(value: boolean | string) { this._readonly = normalizeBoolean(value); }

    @Attribute()
    get clearable(): boolean { return this._clearable; }
    set clearable(value: boolean | string) { this._clearable = normalizeBoolean(value); }

    get clearGlyph(): string {
        return '✕';
    }

    get htmlType(): TextFieldType {
        return this.type || 'text';
    }

    get fieldClass(): string {
        return [
            this._disabled ? 'is-disabled' : '',
            this._readonly ? 'is-readonly' : '',
            this.error ? 'has-error' : '',
            this.className
        ].filter(Boolean).join(' ');
    }

    onInput(event: any): void {
        this.value = String(event?.target?.value ?? '');
        this.changeAction?.(this.value);
    }

    onKeydown(event: any): void {
        if (event?.key === 'Enter' && !this._multiline) {
            event?.preventDefault?.();
            this.submitAction?.(this.value);
            return;
        }
        if (event?.key === 'Escape' && this._clearable) {
            event?.preventDefault?.();
            this.clear();
        }
    }

    onBlur(): void {
        this.blurAction?.();
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
