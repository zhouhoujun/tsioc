import { Attribute, Component } from '@tsdi/components';
import { normalizeBoolean } from '../../src/ui';

/**
 * Renderer-neutral checkbox. Uses a semantic `role="checkbox"` control instead
 * of a native input so the checked glyph is visible in terminal hosts too.
 */
@Component({
    selector: 'ui-checkbox',
    template: `
    <span class="ui-checkbox {{checkboxClass}}"
        role="checkbox"
        aria-checked="{{checked}}"
        aria-disabled="{{disabled}}"
        tabindex="{{disabled ? -1 : 0}}"
        focusable="{{!disabled}}"
        @click="toggle()"
        @keydown="onKeydown($event)">
        <span class="ui-checkbox-box" aria-hidden="true">{{checked ? '✓' : ' '}}</span>
        <span class="ui-checkbox-label" v-if="label">{{label}}</span>
        <v-content></v-content>
    </span>`
})
export class CheckboxComponent {
    @Attribute() label = '';
    @Attribute() className = '';
    @Attribute() changeAction?: (checked: boolean) => void;
    private _checked = false;
    private _disabled = false;

    @Attribute()
    get checked(): boolean { return this._checked; }
    set checked(value: boolean | string) { this._checked = normalizeBoolean(value); }

    @Attribute()
    get disabled(): boolean { return this._disabled; }
    set disabled(value: boolean | string) { this._disabled = normalizeBoolean(value); }

    get checkboxClass(): string {
        return [
            this._checked ? 'is-checked' : '',
            this._disabled ? 'is-disabled' : '',
            this.className
        ].filter(Boolean).join(' ');
    }

    toggle(): void {
        if (this._disabled) {
            return;
        }
        this.checked = !this._checked;
        this.changeAction?.(this._checked);
    }

    onKeydown(event: any): void {
        if (event?.key === ' ' || event?.key === 'Enter') {
            event?.preventDefault?.();
            this.toggle();
        }
    }
}
