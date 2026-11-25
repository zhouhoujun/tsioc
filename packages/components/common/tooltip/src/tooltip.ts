import { Attribute, Component, ElementRef, EventEmitter } from '@tsdi/components';
import { Optional } from '@tsdi/ioc';
import { markElementRefRaw } from '../../src/raw-element';
import { nextUiId, normalizeBoolean } from '../../src/ui';
import { installTooltipStyles } from './tooltip.styles';

export type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right';

/**
 * Renderer-neutral tooltip (Ant Design Tooltip / MUI Tooltip).
 *
 * The popup text is the same in both renderers; browsers position it over the
 * trigger, terminal hosts paint it inline after the trigger when open. Opening
 * follows focus on both surfaces; browsers additionally open on hover. Hosts
 * can drive `open` directly when they own a different trigger model.
 */
@Component({
    selector: 'ui-tooltip',
    template: `
    <span class="ui-tooltip {{tooltipClass}}"
        tabindex="{{focusable && !disabled ? 0 : -1}}"
        focusable="{{focusable && !disabled}}"
        aria-describedby="{{openState ? tooltipId : ''}}"
        @mouseenter="show()"
        @mouseleave="hide()"
        @focus="show()"
        @blur="hide()"
        @keydown="onKeydown($event)">
        <v-content></v-content>
        <span class="ui-tooltip-popup is-{{placement}}" id="{{tooltipId}}"
            role="tooltip" v-if="openState">{{content}}</span>
    </span>`
})
export class TooltipComponent {
    constructor(@Optional() protected elementRef?: ElementRef) {
        markElementRefRaw(elementRef);
    }

    onInit(): void {
        installTooltipStyles((this.elementRef?.nativeElement as { ownerDocument?: Document } | undefined)?.ownerDocument);
    }

    @Attribute() content = '';
    @Attribute() visibleChange = new EventEmitter<boolean>();

    protected readonly uid = nextUiId('ui-tooltip');
    private _open = false;
    private _disabled = false;
    private _focusable = false;
    private _placement: TooltipPlacement = 'top';

    @Attribute()
    get visible(): boolean { return this._open; }
    set visible(value: boolean | string) { this._open = normalizeBoolean(value); }

    @Attribute()
    get disabled(): boolean { return this._disabled; }
    set disabled(value: boolean | string) { this._disabled = normalizeBoolean(value); }

    @Attribute()
    get focusable(): boolean { return this._focusable; }
    set focusable(value: boolean | string) { this._focusable = normalizeBoolean(value); }

    @Attribute()
    get placement(): TooltipPlacement { return this._placement; }
    set placement(value: string) {
        this._placement = value === 'bottom' || value === 'left' || value === 'right' ? value : 'top';
    }

    get tooltipId(): string {
        return this.uid;
    }

    get openState(): boolean {
        return this._open && !this._disabled && !!this.content;
    }

    get tooltipClass(): string {
        return this._disabled ? 'is-disabled' : '';
    }

    show(): void {
        if (this._disabled || !this.content || this._open) {
            return;
        }
        this._open = true;
        this.visibleChange.emit(true);
    }

    hide(): void {
        if (!this._open) {
            return;
        }
        this._open = false;
        this.visibleChange.emit(false);
    }

    onKeydown(event: any): void {
        if (event?.key === 'Escape' && this.openState) {
            event.preventDefault?.();
            event.stopPropagation?.();
            this.hide();
        }
    }
}
