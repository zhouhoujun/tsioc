import { Attribute, Component, ElementRef } from '@tsdi/components';
import { Optional } from '@tsdi/ioc';
import { markElementRefRaw } from '../../src/raw-element';

/** Next enabled button index for Arrow/Home/End navigation. */
export function nextButtonGroupIndex(current: number, length: number, key: string): number {
    if (!length) {
        return -1;
    }
    if (key === 'Home') {
        return 0;
    }
    if (key === 'End') {
        return length - 1;
    }
    if (key !== 'ArrowLeft' && key !== 'ArrowRight' && key !== 'ArrowUp' && key !== 'ArrowDown') {
        return -1;
    }
    const step = key === 'ArrowRight' || key === 'ArrowDown' ? 1 : -1;
    return ((current < 0 ? 0 : current) + step + length) % length;
}

/**
 * Attached action group (MUI ButtonGroup / AntD Space.Compact).
 *
 * Buttons keep their native semantics; the group only shares borders/radii and
 * adds Arrow/Home/End focus movement between enabled buttons for keyboard users.
 */
@Component({
    selector: 'ui-button-group',
    template: `<div class="ui-button-group {{className}}" role="group" aria-label="{{ariaLabel}}"
        @keydown="onKeydown($event)"><v-content></v-content></div>`
})
export class ButtonGroupComponent {
    constructor(@Optional() protected elementRef?: ElementRef) {
        markElementRefRaw(elementRef);
    }

    @Attribute() ariaLabel = '';
    @Attribute() className = '';

    onKeydown(event: any): void {
        const key = String(event?.key || '');
        if (key !== 'ArrowLeft' && key !== 'ArrowRight' && key !== 'ArrowUp'
            && key !== 'ArrowDown' && key !== 'Home' && key !== 'End') {
            return;
        }
        const root = this.elementRef?.nativeElement as HTMLElement | undefined;
        const buttons = Array.from(root?.querySelectorAll?.('.ui-button:not(:disabled)') || []) as HTMLElement[];
        if (!buttons.length) {
            return;
        }
        const active = root?.ownerDocument?.activeElement as HTMLElement | undefined;
        const next = nextButtonGroupIndex(buttons.indexOf(active as HTMLElement), buttons.length, key);
        event.preventDefault?.();
        buttons[next]?.focus?.();
    }
}
