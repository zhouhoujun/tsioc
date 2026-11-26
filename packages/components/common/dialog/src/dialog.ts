import { Attribute, Component, ElementRef, OnDestroy } from '@tsdi/components';
import { Inject, Optional } from '@tsdi/ioc';
import { nextUiId } from '../../src/ui';
import { OverlayManager } from '../../src/overlay-manager';
import { trapFocusTab } from '../../src/focus';
import { getDisplayWidth } from '../../src/display-width';
import { markElementRefRaw } from '../../src/raw-element';
import { normalizeBoolean } from '../../src/ui';
import { installPlainButtonStyles } from '../../src/ui.styles';
import { lockDocumentScroll } from '../../src/overlay-scroll-lock';

/**
 * Renderer-neutral dialog shell: title, optional body lines, hint, projected
 * content and a glyph-only close target. Hosts own the overlay placement and
 * the projected body (forms, lists, action rows); html/console renderers own
 * the visual chrome.
 */
@Component({
    selector: 'dialog-panel, ui-dialog-panel',
    template: `
    <div class="console-panel dialog-panel {{widthClass}} {{className}}"
        role="dialog" aria-modal="{{modal}}" aria-label="{{ariaLabel}}"
        aria-labelledby="{{ariaLabelledby}}" aria-describedby="{{ariaDescribedby}}"
        @keydown="handleKeydown($event)">
        <button class="dialog-close ui-plain-button" type="button" data-plain="true" data-cell-width="2"
            aria-label="{{closeLabel}}" v-if="closable" @click="close">{{closeLabel}}</button>
        <label class="dialog-title" v-show="title">{{title}}</label>
        <div class="dialog-body" [style]="scrollStyle">
            <label class="dialog-line" data-cell-width="0" v-for="(line, index) in lines"
                data-option-index="{{lineOptionIndexes && lineOptionIndexes[index] !== undefined ? lineOptionIndexes[index] : ''}}"
                data-hover="{{lineActions && lineActions[index] ? '' : 'none'}}"
                @click="activateLine(index)">{{line}}</label>
        </div>
        <label class="dialog-hint" v-show="hint">{{hint}}</label>
        <v-content></v-content>
    </div>`
})
export class DialogComponent implements OnDestroy {
    constructor(@Optional() protected elementRef?: ElementRef, @Optional() @Inject(OverlayManager) private overlays?: OverlayManager | null) {
        markElementRefRaw(elementRef);
    }

    onInit(): void {
        // Every browser host gets the same bare ✕/action chrome as the terminal
        // surface without having to adopt the full UI skin.
        installPlainButtonStyles((this.elementRef?.nativeElement as { ownerDocument?: Document } | undefined)?.ownerDocument);
    }

    protected readonly overlayId = nextUiId('ui-dialog');
    private _overlayOpen = false;
    private releaseScrollLock?: () => void;

    /** Opt-in: register this dialog in the shared overlay stack for Escape/focus/dirty checks. */
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
                kind: 'dialog',
                element: this.panelElement(),
                initialFocus: this.initialFocus,
                restoreFocus: this.restoreFocus,
                beforeClose: () => this.beforeCloseAction?.() ?? true,
                close: () => { this._overlayOpen = false; this.syncScrollLock(false); this.closeAction?.(); }
            });
        } else {
            this.overlays?.close(this.overlayId);
        }
    }

    /** Host dirty-check; return false (or reject) to keep the overlay open. */
    @Attribute() beforeCloseAction?: () => boolean | Promise<boolean>;
    /** Space-separated/selector for the initial focus target. */
    @Attribute() initialFocus = '';
    /** Restore the previously focused element when the overlay closes. */
    @Attribute() restoreFocus: boolean | string = true;
    /** Keep Tab focus inside the dialog while it is open. */
    @Attribute() trapFocus: boolean | string = true;
    /** Lock document scrolling while this overlay is registered and open. */
    @Attribute()
    get scrollLock(): boolean { return this._scrollLock; }
    set scrollLock(value: boolean | string) {
        this._scrollLock = normalizeBoolean(value, true);
        if (!this._scrollLock) { this.syncScrollLock(false); }
    }

    @Attribute() title = '';
    @Attribute() lines: string[] = [];
    @Attribute() hint = '';
    @Attribute() ariaLabel = '';
    @Attribute() closeLabel = '✕';
    /** Upper/lower bounds for content-derived width, in terminal cells. */
    @Attribute() maxWidth = 88;
    @Attribute() minWidth = 24;
    /** Border + horizontal padding assumed around the content. */
    @Attribute() horizontalChrome = 6;
    /** Viewport guard for long modal content; empty disables the scroll box. */
    @Attribute() maxHeight = '60vh';
    /** Extra classes for hosts that keep their own skin/selectors. */
    @Attribute() className = '';
    /** Span the host width instead of fitting the content. */
    @Attribute() fullWidth = false;
    /** Optional click handlers aligned with `lines` (rows/actions). */
    @Attribute() lineActions: Array<(() => void) | undefined> = [];
    /** Optional option index exposed to pointer hit-testing for each line. */
    @Attribute() lineOptionIndexes: Array<number | undefined> = [];
    @Attribute() closeAction?: () => void;
    @Attribute() ariaLabelledby = '';
    @Attribute() ariaDescribedby = '';

    private _modal = true;
    private _closable = true;
    private _closeOnEscape = true;
    private _scrollLock = true;

    @Attribute()
    get modal(): boolean { return this._modal; }
    set modal(value: boolean | string) { this._modal = normalizeBoolean(value, true); }

    @Attribute()
    get closable(): boolean { return this._closable; }
    set closable(value: boolean | string) { this._closable = normalizeBoolean(value, true); }

    @Attribute()
    get closeOnEscape(): boolean { return this._closeOnEscape; }
    set closeOnEscape(value: boolean | string) { this._closeOnEscape = normalizeBoolean(value, true); }

    get scrollStyle(): Record<string, string> {
        return this.maxHeight
            ? {
                'max-height': String(this.maxHeight),
                'overflow-y': 'auto',
                'overscroll-behavior': 'contain'
            }
            : {};
    }

    get resolvedShellStyle(): string {
        return `max-width: ${this.resolveContentWidth()}ch;`;
    }

    get widthClass(): string {
        return this.fullWidth ? '' : `dialog-w-${this.resolveContentWidth()}`;
    }

    activateLine(index: number): void {
        this.lineActions?.[index]?.();
    }

    /** Fit the modal to its content so a tall QR panel leaves the transcript visible. */
    protected resolveContentWidth(): number {
        const max = Math.max(8, Number(this.maxWidth) || 88);
        const min = Math.max(8, Math.min(max, Number(this.minWidth) || 24));
        const chrome = Math.max(0, Number(this.horizontalChrome) || 0);
        const longest = Math.max(
            0,
            getDisplayWidth(String(this.title || '')),
            getDisplayWidth(String(this.hint || '')),
            ...(this.lines || []).map(line => getDisplayWidth(String(line || '')))
        );
        return Math.max(min, Math.min(max, longest + chrome));
    }

    handleKeydown(event: any): void {
        if (this._closeOnEscape && (event?.key === 'Escape' || event?.key === 'Esc')) {
            event.preventDefault?.();
            if (this._overlayOpen && this.overlays) {
                void this.overlays.escape();
            } else {
                this.close();
            }
            return;
        }
        if (event?.key === 'Tab' && this._overlayOpen && normalizeBoolean(this.trapFocus as any, true)) {
            trapFocusTab(this.panelElement(), event);
        }
    }

    protected panelElement(): any {
        const element = this.elementRef?.nativeElement as any;
        if (!element) {
            return undefined;
        }
        return element.matches?.('.dialog-panel') ? element : element.querySelector?.('.dialog-panel') || element;
    }


    close(): void {
        if (this._overlayOpen) {
            // Manager.close() removes the entry without invoking entry.close,
            // so the host callback must still run for programmatic closes.
            this.overlays?.close(this.overlayId);
            this._overlayOpen = false;
            this.syncScrollLock(false);
            this.closeAction?.();
            return;
        }
        this.closeAction?.();
    }

    protected ownerDocument(): Document | undefined {
        return (this.elementRef?.nativeElement as { ownerDocument?: Document } | undefined)?.ownerDocument;
    }

    protected syncScrollLock(active: boolean): void {
        if (active && this._scrollLock && !this.releaseScrollLock) {
            this.releaseScrollLock = lockDocumentScroll(this.ownerDocument());
        } else if (!active && this.releaseScrollLock) {
            this.releaseScrollLock();
            this.releaseScrollLock = undefined;
        }
    }

    onDestroy(): void {
        if (this._overlayOpen) {
            this.overlays?.close(this.overlayId);
            this._overlayOpen = false;
        }
        this.syncScrollLock(false);
    }
}
