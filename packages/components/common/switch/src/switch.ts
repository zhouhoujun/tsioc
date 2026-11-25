import { Attribute, Component } from '@tsdi/components';
import { normalizeBoolean } from '../../src/ui';

/**
 * Renderer-neutral on/off switch. The state label (`On`/`Off`) is part of the
 * text run so terminal hosts show a clear state without CSS.
 */
@Component({
    selector: 'ui-switch',
    template: `
    <span class="ui-switch {{switchClass}}"
        role="switch"
        aria-checked="{{checked}}"
        aria-disabled="{{disabled}}"
        tabindex="{{disabled ? -1 : 0}}"
        focusable="{{!disabled}}"
        @click="toggle()"
        @keydown="onKeydown($event)">
        <span class="ui-switch-track" aria-hidden="true"><span class="ui-switch-thumb"></span></span>
        <span class="ui-switch-label" v-if="label">{{label}}</span>
        <span class="ui-switch-state" aria-hidden="true">{{checked ? onLabel : offLabel}}</span>
        <v-content></v-content>
    </span>`
})
export class SwitchComponent {
    @Attribute() label = '';
    @Attribute() onLabel = 'On';
    @Attribute() offLabel = 'Off';
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

    get switchClass(): string {
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
