import { Attribute, Component, ElementRef } from '@tsdi/components';
import { Inject, Optional } from '@tsdi/ioc';
import { nextUiId } from '../../src/ui';
import { OverlayManager } from '../../src/overlay-manager';
import { markElementRefRaw } from '../../src/raw-element';
import { normalizeBoolean } from '../../src/ui';
import { installPlainButtonStyles } from '../../src/ui.styles';
import { lockDocumentScroll } from '../../src/overlay-scroll-lock';
import { attachOverlayBackdrop } from '../../src/overlay-backdrop';
import { installDrawerStyles } from './drawer.styles';

export type DrawerPlacement = 'left' | 'right' | 'bottom';

/**
 * Host-controlled side panel (Ant Design Drawer).
 *
 * Browsers paint a fixed edge panel; terminal hosts paint the same title/lines
 * inline. `visible` is owned by the host so overlay placement stays a host
 * decision, while Escape/close handling and the plain close button are shared.
 */
@Component({
    selector: 'ui-drawer',
    template: `
    <div class="ui-drawer is-{{placement}} {{drawerClass}}" role="dialog"
        aria-modal="true" aria-label="{{ariaLabel || title}}"
        [style]="panelStyle" v-show="visibleState" @keydown="onKeydown($event)">
        <div class="ui-drawer-header" v-if="title">
            <span class="ui-drawer-title">{{title}}</span>
            <button class="ui-drawer-close ui-plain-button" type="button" data-plain="true"
                v-if="closable" aria-label="{{closeLabel}}"
                @click="close" @keydown="closeKeydown($event)">{{closeGlyph}}</button>
        </div>
        <div class="ui-drawer-body">
            <span class="ui-drawer-line" v-for="line in viewLines">{{line}}</span>
            <v-content></v-content>
        </div>
    </div>`
})
export class DrawerComponent {
    constructor(@Optional() protected elementRef?: ElementRef, @Optional() @Inject(OverlayManager) private overlays?: OverlayManager | null) {
        markElementRefRaw(elementRef);
    }

    protected readonly overlayId = nextUiId('ui-drawer');
    private _overlayOpen = false;
    private releaseScrollLock?: () => void;
    private releaseBackdrop?: () => void;
    private _backdrop = true;
    private _closeOnBackdrop = true;

    /** Host dirty-check; return false (or reject) to keep the drawer open. */
    @Attribute() beforeCloseAction?: () => boolean | Promise<boolean>;

    /** Opt-in overlay-stack registration (focus/escape/dirty-check ordering). */
    @Attribute()
    get overlayOpen(): boolean { return this._overlayOpen; }
    set overlayOpen(value: boolean | string) {
        const next = normalizeBoolean(value);
        if (next === this._overlayOpen) {
            return;
        }
        this._overlayOpen = next;
        this.syncScrollLock(next);
        this.syncBackdrop(next);
        if (next) {
            this.overlays?.register({
                id: this.overlayId,
                kind: 'drawer',
                element: this.elementRef?.nativeElement,
                beforeClose: () => this.beforeCloseAction?.() ?? true,
                close: () => { this._overlayOpen = false; this.syncScrollLock(false); this.syncBackdrop(false); this.closeAction?.(); }
            });
        } else {
            this.overlays?.close(this.overlayId);
        }
    }

    onInit(): void {
        const doc = (this.elementRef?.nativeElement as { ownerDocument?: Document } | undefined)?.ownerDocument;
        installDrawerStyles(doc);
        installPlainButtonStyles(doc);
    }

    /** Browser backdrop (no-op in terminal hosts). */
    @Attribute()
    get backdrop(): boolean { return this._backdrop; }
    set backdrop(value: boolean | string) { this._backdrop = normalizeBoolean(value, true); }

    @Attribute()
    get closeOnBackdrop(): boolean { return this._closeOnBackdrop; }
    set closeOnBackdrop(value: boolean | string) { this._closeOnBackdrop = normalizeBoolean(value, true); }

    @Attribute() title = '';
    @Attribute() lines: string[] = [];
    @Attribute() ariaLabel = '';
    @Attribute() closeLabel = 'Close';
    @Attribute() size: number | string = 32;
    @Attribute() placement: DrawerPlacement = 'right';
    @Attribute() className = '';
    @Attribute() closeAction?: () => void;

    private _visible = false;
    private _closable = true;

    @Attribute()
    get visible(): boolean { return this._visible; }
    set visible(value: boolean | string) { this._visible = normalizeBoolean(value); }

    @Attribute()
    get closable(): boolean { return this._closable; }
    set closable(value: boolean | string) { this._closable = normalizeBoolean(value, true); }

    get closeGlyph(): string {
        return '✕';
    }

    get visibleState(): boolean {
        return this._visible;
    }

    get drawerClass(): string {
        return [this.className].filter(Boolean).join(' ');
    }

    get viewLines(): string[] {
        return Array.isArray(this.lines) ? this.lines.map(line => String(line ?? '')) : [];
    }

    get panelStyle(): Record<string, string> {
        const value = typeof this.size === 'number' ? `${this.size}ch` : String(this.size || '32ch');
        return this.placement === 'bottom'
            ? { height: value, width: '100%' }
            : { width: value };
    }

    close(): void {
        this.overlays?.close(this.overlayId);
        this._overlayOpen = false;
        this.syncScrollLock(false);
        this.syncBackdrop(false);
        this.closeAction?.();
        this._visible = false;
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

    protected syncBackdrop(active: boolean): void {
        if (active && this._backdrop && !this.releaseBackdrop) {
            const host = this.elementRef?.nativeElement as any;
            const doc = host?.ownerDocument as Document | undefined;
            const panel = host?.matches?.('.ui-drawer') ? host : host?.querySelector?.('.ui-drawer') || host;
            this.releaseBackdrop = attachOverlayBackdrop(doc, panel, () => this.backdropClick());
        } else if (!active && this.releaseBackdrop) {
            this.releaseBackdrop();
            this.releaseBackdrop = undefined;
        }
    }

    protected backdropClick(): void {
        if (!this._closeOnBackdrop) {
            return;
        }
        if (this._overlayOpen && this.overlays) {
            void this.overlays.outside();
            return;
        }
        this.close();
    }

    onDestroy(): void {
        this.syncScrollLock(false);
        this.syncBackdrop(false);
    }
}
