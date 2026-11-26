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
    /** Hover/focus intent delays; Escape always closes immediately. */
    @Attribute() openDelay: number | string = 0;
    @Attribute() closeDelay: number | string = 0;
    @Attribute() visibleChange = new EventEmitter<boolean>();

    protected readonly uid = nextUiId('ui-tooltip');
    private _open = false;
    private _disabled = false;
    private _focusable = false;
    private _placement: TooltipPlacement = 'top';
    private openTimer?: any;
    private closeTimer?: any;
    private destroyed = false;

    @Attribute()
    get visible(): boolean { return this._open; }
    set visible(value: boolean | string) {
        this.cancelTimers();
        this._open = normalizeBoolean(value);
    }

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
        if (this._disabled || !this.content || this._open || this.destroyed) {
            return;
        }
        this.clearTimer(false);
        const delay = this.delayMs(this.openDelay);
        if (!delay) {
            this.openNow();
            return;
        }
        this.openTimer = setTimeout(() => {
            this.openTimer = undefined;
            if (!this.destroyed) {
                this.openNow();
            }
        }, delay);
    }

    hide(): void {
        this.clearTimer(true);
        if (!this._open) {
            return;
        }
        const delay = this.delayMs(this.closeDelay);
        if (!delay) {
            this.closeNow();
            return;
        }
        this.closeTimer = setTimeout(() => {
            this.closeTimer = undefined;
            if (!this.destroyed) {
                this.closeNow();
            }
        }, delay);
    }

    onDestroy(): void {
        this.destroyed = true;
        this.cancelTimers();
    }

    protected delayMs(value: number | string): number {
        const delay = Math.floor(Number(value) || 0);
        return delay > 0 ? delay : 0;
    }

    protected openNow(): void {
        if (this._open || this.destroyed || this._disabled || !this.content) {
            return;
        }
        this._open = true;
        this.visibleChange.emit(true);
    }

    protected closeNow(): void {
        if (!this._open) {
            return;
        }
        this._open = false;
        this.visibleChange.emit(false);
    }

    protected clearTimer(which: boolean): void {
        const timer = which ? this.openTimer : this.closeTimer;
        if (timer) {
            clearTimeout(timer);
            which ? this.openTimer = undefined : this.closeTimer = undefined;
        }
    }

    protected cancelTimers(): void {
        this.clearTimer(true);
        this.clearTimer(false);
    }

    onKeydown(event: any): void {
        if (event?.key === 'Escape' && this.openState) {
            event.preventDefault?.();
            event.stopPropagation?.();
            this.cancelTimers();
            this.closeNow();
        }
    }
}
