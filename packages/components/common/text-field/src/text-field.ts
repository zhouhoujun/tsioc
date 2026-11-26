import { Attribute, Component } from '@tsdi/components';
import { nextUiId, normalizeBoolean } from '../../src/ui';
import { resolveFieldAria } from '../../field/src/field-semantics';

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
        <label class="ui-field-label" for="{{fieldId}}" v-if="label">{{label}}<span class="ui-field-required" v-if="required">*</span></label>
        <div class="ui-field-row">
            <span class="ui-field-addon is-before" v-if="addonBefore">{{addonBefore}}</span>
            <span class="ui-field-prefix" v-if="prefix" aria-hidden="true">{{prefix}}</span>
            <input class="ui-field-input" v-if="!multiline"
                id="{{fieldId}}"
                name="{{name}}"
                type="{{htmlType}}"
                [value]="value"
                placeholder="{{placeholder}}"
                [disabled]="disabled"
                [readOnly]="readonly"
                aria-label="{{ariaLabel || label || placeholder}}"
                aria-required="{{required}}"
                aria-invalid="{{!!error}}"
                aria-describedby="{{describedBy}}"
                v-bind="inputAttrs"
                @input="onInput($event)"
                @keydown="onKeydown($event)"
                @blur="onBlur()" />
            <textarea class="ui-field-input ui-field-textarea" v-if="multiline"
                id="{{fieldId}}"
                name="{{name}}"
                [value]="value"
                rows="{{rows}}"
                placeholder="{{placeholder}}"
                [disabled]="disabled"
                [readOnly]="readonly"
                aria-label="{{ariaLabel || label || placeholder}}"
                aria-required="{{required}}"
                aria-invalid="{{!!error}}"
                aria-describedby="{{describedBy}}"
                v-bind="inputAttrs"
                @input="onInput($event)"
                @keydown="onKeydown($event)"
                @blur="onBlur()"></textarea>
            <span class="ui-field-suffix" v-if="suffix" aria-hidden="true">{{suffix}}</span>
            <button class="ui-field-reveal ui-plain-button" type="button" data-plain="true"
                v-if="type === 'password' && revealable" aria-label="{{revealed ? hidePasswordLabel : showPasswordLabel}}"
                aria-pressed="{{revealed}}" @click="togglePassword">{{revealed ? hideGlyph : showGlyph}}</button>
            <button class="ui-field-clear" type="button" data-plain="true" v-if="clearable && value"
                aria-label="{{clearLabel}}" @click="clear">{{clearGlyph}}</button>
            <span class="ui-field-addon is-after" v-if="addonAfter">{{addonAfter}}</span>
        </div>
        <span class="ui-field-hint" id="{{hintId}}" v-if="hint">{{hint}}</span>
        <span class="ui-field-error" id="{{errorId}}" role="alert" v-if="error">{{error}}</span>
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
    /** Explicit id for the inner input; defaults to a generated one. */
    @Attribute() inputId = '';
    @Attribute() name = '';
    @Attribute() prefix = '';
    @Attribute() suffix = '';
    @Attribute() addonBefore = '';
    @Attribute() addonAfter = '';
    @Attribute() inputMode = '';
    @Attribute() autocomplete = '';
    @Attribute() enterKeyHint = '';
    @Attribute() maxLength: number | string = 0;

    @Attribute() showPasswordLabel = 'Show password';
    @Attribute() hidePasswordLabel = 'Hide password';
    @Attribute() showGlyph = '◉';
    @Attribute() hideGlyph = '○';
    @Attribute() changeAction?: (value: string) => void;
    @Attribute() submitAction?: (value: string) => void;
    @Attribute() blurAction?: () => void;
    @Attribute() clearAction?: () => void;

    protected readonly uid = nextUiId('ui-text-field');

    private _multiline = false;
    private _required = false;
    private _disabled = false;
    private _readonly = false;
    private _clearable = false;
    private revealed = false;
    private _revealable = false;

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

    @Attribute()
    get revealable(): boolean { return this._revealable; }
    set revealable(value: boolean | string) { this._revealable = normalizeBoolean(value); }

    get clearGlyph(): string {
        return '✕';
    }

    get fieldId(): string {
        return this.inputId || this.uid;
    }

    get fieldAria() {
        return resolveFieldAria({ controlId: this.fieldId, hint: this.hint, error: this.error });
    }

    get hintId(): string {
        return this.fieldAria.hintId;
    }

    get errorId(): string {
        return this.fieldAria.errorId;
    }

    /** Space-separated ids for the hint and error text. */
    get describedBy(): string {
        return this.fieldAria.describedBy;
    }

    get htmlType(): TextFieldType {
        const type = this.type || 'text';
        return type === 'password' && this.revealed ? 'text' : type;
    }

    get maxLengthNumber(): number {
        return Math.max(0, Math.floor(Number(this.maxLength) || 0));
    }


    get inputAttrs(): Record<string, string> {
        const attrs: Record<string, string> = {};
        if (this.maxLengthNumber) {
            attrs.maxlength = String(this.maxLengthNumber);
        }
        if (this.inputMode) {
            attrs.inputmode = String(this.inputMode);
        }
        if (this.autocomplete) {
            attrs.autocomplete = String(this.autocomplete);
        }
        if (this.enterKeyHint) {
            attrs.enterkeyhint = String(this.enterKeyHint);
        }
        return attrs;
    }

    togglePassword(): void {
        if (this._disabled || this._readonly || this.type !== 'password' || !this._revealable) {
            return;
        }
        this.revealed = !this.revealed;
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
        if ((event?.metaKey || event?.ctrlKey) && event?.key === 'Backspace' && this._clearable) {
            event.preventDefault?.();
            this.clear();
            return;
        }
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
