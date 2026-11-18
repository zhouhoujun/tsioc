import { Attribute, Component } from '@tsdi/components';
import { normalizeBoolean } from '../../src/ui';

/**
 * Select/menu trigger for a host-owned dropdown (`select-list`, menu bar, ...).
 * It renders the current value and dispatches `action`; opening the menu stays
 * with the host so the same trigger works for dialogs and composer pickers.
 */
@Component({
    selector: 'ui-select-trigger',
    template: `
    <span class="ui-select-trigger {{triggerClass}}"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded="{{open}}"
        aria-disabled="{{disabled}}"
        aria-label="{{ariaLabel || label || placeholder}}"
        tabindex="{{disabled ? -1 : 0}}"
        @click="activate"
        @keydown="onKeydown($event)">
        <icon class="ui-select-icon" v-if="icon" [name]="icon" [glyph]="iconGlyph || icon" size="sm"></icon>
        <span class="ui-select-value">{{displayLabel}}</span>
        <button class="ui-select-clear" type="button"
            v-if="clearable && (value || label)"
            aria-label="{{clearLabel}}" @click="clear($event)">{{clearGlyph}}</button>
        <span class="ui-select-arrow" aria-hidden="true">▾</span>
        <v-content></v-content>
    </span>`
})
export class SelectTriggerComponent {
    @Attribute() value = '';
    @Attribute() label = '';
    @Attribute() placeholder = 'Select…';
    @Attribute() icon = '';
    @Attribute() iconGlyph = '';
    @Attribute() ariaLabel = '';
    @Attribute() clearLabel = 'Clear';
    @Attribute() className = '';
    @Attribute() action?: () => void;
    @Attribute() clearAction?: () => void;
    private _open = false;
    private _disabled = false;
    private _clearable = false;

    @Attribute()
    get open(): boolean { return this._open; }
    set open(value: boolean | string) { this._open = normalizeBoolean(value); }

    @Attribute()
    get disabled(): boolean { return this._disabled; }
    set disabled(value: boolean | string) { this._disabled = normalizeBoolean(value); }

    @Attribute()
    get clearable(): boolean { return this._clearable; }
    set clearable(value: boolean | string) { this._clearable = normalizeBoolean(value); }

    get clearGlyph(): string {
        return '✕';
    }

    get displayLabel(): string {
        return String(this.label || this.value || this.placeholder || '');
    }

    get triggerClass(): string {
        return [
            this._open ? 'is-open' : '',
            this._disabled ? 'is-disabled' : '',
            this.className
        ].filter(Boolean).join(' ');
    }

    activate(): void {
        if (this._disabled) {
            return;
        }
        this.action?.();
    }

    clear(event?: Event): void {
        event?.stopPropagation?.();
        if (this._disabled) {
            return;
        }
        this.value = '';
        this.label = '';
        this.clearAction?.();
    }

    onKeydown(event: any): void {
        if (this._disabled) {
            return;
        }
        if (event?.key === 'Enter' || event?.key === ' ') {
            event?.preventDefault?.();
            this.activate();
            return;
        }
        if (event?.key === 'Escape' && this._clearable) {
            this.clear(event);
        }
    }
}
