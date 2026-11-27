import { Attribute, Component, ElementRef, EventEmitter } from '@tsdi/components';
import { Optional } from '@tsdi/ioc';
import { markElementRefRaw } from '../../src/raw-element';
import { nextUiId, normalizeBoolean } from '../../src/ui';
import { installTooltipStyles } from './tooltip.styles';
import { resolveFlippedPlacement, resolveOverlayShift, resolvePortalStyle, UiPlacement } from '../../src/overlay-placement';

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
        <span class="ui-tooltip-popup is-{{popupPlacement}}" id="{{tooltipId}}" [style]="popupStyle"
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
    private _flip = true;
    private _portal = false;
    private portalStyle: Record<string, string> = {};
    private _placement: TooltipPlacement = 'top';
    private resolvedPlacement: TooltipPlacement | '' = '';
    private shiftX = 0;
    private shiftY = 0;
    private openTimer?: any;
    private closeTimer?: any;
    private destroyed = false;

    @Attribute()
    get visible(): boolean { return this._open; }
    set visible(value: boolean | string) {
        this.cancelTimers();
        this._open = normalizeBoolean(value);
        this.resolvedPlacement = '';
        if (this._open) {
            void Promise.resolve().then(() => Promise.resolve()).then(() => this.resolvePlacement());
        }
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
        this.resolvedPlacement = '';
    }

    /** Flip to the opposite side when the popup would overflow the viewport. */
    @Attribute()
    get flip(): boolean { return this._flip; }
    set flip(value: boolean | string) {
        this._flip = normalizeBoolean(value, true);
        if (!this._flip) {
            this.resolvedPlacement = '';
        }
    }

    /** Render with fixed viewport coordinates so scroll containers cannot clip it. */
    @Attribute()
    get portal(): boolean { return this._portal; }
    set portal(value: boolean | string) { this._portal = normalizeBoolean(value); }

    get popupPlacement(): TooltipPlacement {
        return this.resolvedPlacement || this._placement;
    }

    get popupStyle(): Record<string, string> {
        return {
            '--ui-overlay-shift-x': `${this.shiftX}px`,
            '--ui-overlay-shift-y': `${this.shiftY}px`,
            ...this.portalStyle
        };
    }

    protected resolvePlacement(): void {
        if (!this.openState) {
            this.resolvedPlacement = '';
            this.shiftX = 0;
            this.shiftY = 0;
            return;
        }
        const host = this.elementRef?.nativeElement as any;
        const anchor = host?.matches?.('.ui-tooltip') ? host : host?.querySelector?.('.ui-tooltip');
        const popup = anchor?.querySelector?.('.ui-tooltip-popup');
        const next = this._flip
            ? resolveFlippedPlacement(anchor, popup, this._placement as UiPlacement) as TooltipPlacement
            : this._placement;
        this.resolvedPlacement = next === this._placement ? '' : next;
        const shift = resolveOverlayShift(anchor, popup, next as UiPlacement, 6, true);
        this.shiftX = shift.x;
        this.shiftY = shift.y;
        this.resolvePortal(anchor, popup, next as UiPlacement);
    }

    protected resolvePortal(anchor: any, popup: any, placement: TooltipPlacement): void {
        if (!this._portal) {
            this.portalStyle = {};
            return;
        }
        this.portalStyle = resolvePortalStyle(anchor, popup, placement as UiPlacement, this.shiftX, this.shiftY) || {};
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
        void Promise.resolve().then(() => Promise.resolve()).then(() => this.resolvePlacement());
    }

    protected closeNow(): void {
        if (!this._open) {
            return;
        }
        this._open = false;
        this.resolvedPlacement = '';
        this.shiftX = 0;
        this.shiftY = 0;
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
