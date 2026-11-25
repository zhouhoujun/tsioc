import { Attribute, Component, ElementRef } from '@tsdi/components';
import { Optional } from '@tsdi/ioc';
import { markElementRefRaw } from '../../src/raw-element';
import { normalizeBoolean } from '../../src/ui';
import { installInlineInputStyles } from './inline-input.styles';

/**
 * Click-to-edit value used by tab/session/task titles. Enter and blur commit,
 * Escape cancels, and the host owns persistence through `changeAction` /
 * `submitAction`.
 */
@Component({
    selector: 'ui-inline-input',
    template: `
    <div class="ui-inline-input {{className}}" data-editing="{{editingState}}">
        <input class="ui-inline-input-field" v-if="editingState" type="text"
            [value]="draft" placeholder="{{placeholder}}" maxlength="{{maxLength}}"
            [disabled]="disabled" aria-label="{{ariaLabel || label || placeholder}}"
            @input="onInput($event)" @keydown="onKeydown($event)" @blur="onBlur()" />
        <span class="ui-inline-input-value" v-else tabindex="{{disabled ? null : 0}}" role="button"
            aria-label="{{ariaLabel || label || value}}" @click="beginEdit"
            @keydown="onValueKeydown($event)">{{value || placeholder}}</span>
        <button class="ui-inline-input-edit ui-plain-button" type="button" v-if="!editingState"
            [disabled]="disabled" aria-label="{{editLabel}}" @click="beginEdit">{{editGlyph}}</button>
    </div>`
})
export class InlineInputComponent {
    constructor(@Optional() protected elementRef?: ElementRef) {
        markElementRefRaw(elementRef);
    }

    onInit(): void {
        installInlineInputStyles((this.elementRef?.nativeElement as { ownerDocument?: Document } | undefined)?.ownerDocument);
    }

    @Attribute() value = '';
    @Attribute() label = '';
    @Attribute() ariaLabel = '';
    @Attribute() placeholder = '';
    @Attribute() maxLength = 200;
    @Attribute() editLabel = 'Edit';
    @Attribute() editGlyph = '✎';
    @Attribute() className = '';
    @Attribute() changeAction?: (value: string) => void;
    @Attribute() submitAction?: (value: string) => void;
    @Attribute() cancelAction?: () => void;
    @Attribute() editAction?: () => void;

    private _editing = false;
    private _disabled = false;
    private _submitOnBlur = true;
    private _selectOnFocus = true;
    draft = '';

    @Attribute()
    get editing(): boolean { return this._editing; }
    set editing(value: boolean | string) {
        const next = normalizeBoolean(value);
        if (next === this._editing) {
            return;
        }
        this._editing = next;
        this.draft = next ? String(this.value ?? '') : this.draft;
        if (next) {
            this.focusField();
        }
    }

    @Attribute()
    get disabled(): boolean { return this._disabled; }
    set disabled(value: boolean | string) { this._disabled = normalizeBoolean(value); }

    @Attribute()
    get submitOnBlur(): boolean { return this._submitOnBlur; }
    set submitOnBlur(value: boolean | string) { this._submitOnBlur = normalizeBoolean(value, true); }

    @Attribute()
    get selectOnFocus(): boolean { return this._selectOnFocus; }
    set selectOnFocus(value: boolean | string) { this._selectOnFocus = normalizeBoolean(value, true); }

    get editingState(): boolean {
        return this._editing;
    }

    beginEdit(): void {
        if (this._disabled || this._editing) {
            return;
        }
        this.draft = String(this.value ?? '');
        this._editing = true;
        this.editAction?.();
        this.focusField();
    }

    onInput(event: any): void {
        this.draft = String(event?.target?.value ?? '');
    }

    onKeydown(event: any): void {
        if (event?.key === 'Enter') {
            event.preventDefault?.();
            this.commit();
        } else if (event?.key === 'Escape' || event?.key === 'Esc') {
            event.preventDefault?.();
            this.cancel();
        }
    }

    onValueKeydown(event: any): void {
        if (event?.key === 'Enter' || event?.key === ' ' || event?.key === 'Spacebar') {
            event.preventDefault?.();
            this.beginEdit();
        }
    }

    onBlur(): void {
        if (this._editing && this._submitOnBlur) {
            this.commit();
        }
    }

    commit(): void {
        if (!this._editing) {
            return;
        }
        const value = String(this.draft ?? '');
        this._editing = false;
        this.value = value;
        this.changeAction?.(value);
        this.submitAction?.(value);
    }

    cancel(): void {
        if (!this._editing) {
            return;
        }
        this._editing = false;
        this.draft = String(this.value ?? '');
        this.cancelAction?.();
    }

    protected focusField(): void {
        const input = (this.elementRef?.nativeElement as any)?.querySelector?.('.ui-inline-input-field');
        if (!input) {
            return;
        }
        void Promise.resolve().then(() => {
            input.focus?.();
            if (this._selectOnFocus) {
                input.select?.();
            }
        });
    }
}
