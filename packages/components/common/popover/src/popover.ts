import { Attribute, Component, ElementRef } from '@tsdi/components';
import { Inject, Optional } from '@tsdi/ioc';
import { nextUiId } from '../../src/ui';
import { OverlayManager } from '../../src/overlay-manager';
import { markElementRefRaw } from '../../src/raw-element';
import { normalizeBoolean } from '../../src/ui';
import { installPlainButtonStyles } from '../../src/ui.styles';
import { lockDocumentScroll } from '../../src/overlay-scroll-lock';
import { installPopoverStyles } from './popover.styles';
import { resolveFlippedPlacement, UiPlacement } from '../../src/overlay-placement';

export type PopoverPlacement = 'top' | 'bottom' | 'left' | 'right';

/**
 * Renderer-neutral popover (Ant Design Popover / MUI Popover).
 *
 * `open` is host-owned: the component provides the panel chrome, placement
 * classes and Escape handling; hosts wire their trigger. Browsers position the
 * panel above the anchor, terminal hosts paint the same title/lines inline.
 */
@Component({
    selector: 'ui-popover',
    template: `
    <span class="ui-popover {{popoverClass}}" @keydown="onKeydown($event)">
        <v-content></v-content>
        <div class="ui-popover-popup is-{{popupPlacement}}" role="dialog"
            aria-label="{{ariaLabel || title}}" v-if="visibleState">
            <div class="ui-popover-header" v-if="title">
                <span class="ui-popover-title">{{title}}</span>
                <button class="ui-popover-close ui-plain-button" type="button" data-plain="true"
                    v-if="closable" aria-label="{{closeLabel}}" @click="close" @keydown="closeKeydown($event)">{{closeGlyph}}</button>
            </div>
            <div class="ui-popover-line" v-for="line in viewLines">{{line}}</div>
        </div>
    </span>`
})
export class PopoverComponent {
    constructor(@Optional() protected elementRef?: ElementRef, @Optional() @Inject(OverlayManager) private overlays?: OverlayManager | null) {
        markElementRefRaw(elementRef);
    }

    protected readonly overlayId = nextUiId('ui-popover');
    private _overlayOpen = false;
    private releaseScrollLock?: () => void;

    /** Host dirty-check; return false (or reject) to keep the popover open. */
    @Attribute() beforeCloseAction?: () => boolean | Promise<boolean>;

    /** Opt-in overlay-stack registration (stacked Escape/focus ordering). */
    @Attribute()
    get overlayOpen(): boolean { return this._overlayOpen; }
    set overlayOpen(value: boolean | string) {
        const next = normalizeBoolean(value);
        if (next === this._overlayOpen) {
            return;
        }
        this._overlayOpen = next;
        this.syncScrollLock(next);
        if (next) {
            this.overlays?.register({
                id: this.overlayId,
                kind: 'popover',
                element: this.elementRef?.nativeElement,
                beforeClose: () => this.beforeCloseAction?.() ?? true,
                close: () => { this._overlayOpen = false; this.syncScrollLock(false); this.closeAction?.(); }
            });
        } else {
            this.overlays?.close(this.overlayId);
        }
    }

    onInit(): void {
        const doc = (this.elementRef?.nativeElement as { ownerDocument?: Document } | undefined)?.ownerDocument;
        installPopoverStyles(doc);
        installPlainButtonStyles(doc);
    }

    @Attribute() title = '';
    @Attribute() lines: string[] = [];
    @Attribute() ariaLabel = '';
    @Attribute() closeLabel = 'Close';
    @Attribute() closeAction?: () => void;
    @Attribute() className = '';

    private _visible = false;
    private _closable = true;
    private _flip = true;
    private _placement: PopoverPlacement = 'bottom';
    private resolvedPlacement: PopoverPlacement | '' = '';

    @Attribute()
    get visible(): boolean { return this._visible; }
    set visible(value: boolean | string) {
        this._visible = normalizeBoolean(value);
        this.resolvedPlacement = '';
        if (this._visible) {
            void Promise.resolve().then(() => Promise.resolve()).then(() => this.resolvePlacement());
        }
    }

    @Attribute()
    get closable(): boolean { return this._closable; }
    set closable(value: boolean | string) { this._closable = normalizeBoolean(value, true); }

    @Attribute()
    get placement(): PopoverPlacement { return this._placement; }
    set placement(value: string) {
        this._placement = value === 'top' || value === 'left' || value === 'right' ? value : 'bottom';
        this.resolvedPlacement = '';
    }

    /** Flip to the opposite side when the panel would overflow the viewport. */
    @Attribute()
    get flip(): boolean { return this._flip; }
    set flip(value: boolean | string) {
        this._flip = normalizeBoolean(value, true);
        if (!this._flip) {
            this.resolvedPlacement = '';
        }
    }

    get popupPlacement(): PopoverPlacement {
        return this.resolvedPlacement || this._placement;
    }

    protected resolvePlacement(): void {
        if (!this._flip || !this.visibleState) {
            this.resolvedPlacement = '';
            return;
        }
        const host = this.elementRef?.nativeElement as any;
        const anchor = host?.matches?.('.ui-popover') ? host : host?.querySelector?.('.ui-popover');
        const popup = anchor?.querySelector?.('.ui-popover-popup');
        const next = resolveFlippedPlacement(anchor, popup, this._placement as UiPlacement) as PopoverPlacement;
        this.resolvedPlacement = next === this._placement ? '' : next;
    }

    get closeGlyph(): string {
        return '✕';
    }

    get viewLines(): string[] {
        return Array.isArray(this.lines) ? this.lines.map(line => String(line ?? '')) : [];
    }

    get visibleState(): boolean {
        return this._visible && (!!this.title || !!this.viewLines.length);
    }

    get popoverClass(): string {
        return [this.className].filter(Boolean).join(' ');
    }

    close(): void {
        this.overlays?.close(this.overlayId);
        this._overlayOpen = false;
        this.syncScrollLock(false);
        this.closeAction?.();
        this._visible = false;
        this.resolvedPlacement = '';
    }

    closeKeydown(event: any): void {
        if (event?.key === 'Enter' || event?.key === ' ' || event?.key === 'Spacebar') {
            event.preventDefault?.();
            event.stopPropagation?.();
            this.close();
        }
    }

    onKeydown(event: any): void {
        if (event?.key === 'Escape' && this.visibleState) {
            event.preventDefault?.();
            event.stopPropagation?.();
            this.close();
        }
    }

    /** Lock document scrolling while this overlay is registered and open. */
    @Attribute()
    get scrollLock(): boolean { return this._scrollLock; }
    set scrollLock(value: boolean | string) {
        this._scrollLock = normalizeBoolean(value, true);
        if (!this._scrollLock) { this.syncScrollLock(false); }
    }

    private _scrollLock = true;

    protected syncScrollLock(active: boolean): void {
        if (active && this._scrollLock && !this.releaseScrollLock) {
            const doc = (this.elementRef?.nativeElement as { ownerDocument?: Document } | undefined)?.ownerDocument;
            this.releaseScrollLock = lockDocumentScroll(doc);
        } else if (!active && this.releaseScrollLock) {
            this.releaseScrollLock();
            this.releaseScrollLock = undefined;
        }
    }

    onDestroy(): void {
        this.syncScrollLock(false);
    }
}
