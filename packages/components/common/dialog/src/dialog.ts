import { Attribute, Component, ElementRef } from '@tsdi/components';
import { Optional } from '@tsdi/ioc';
import { getDisplayWidth } from '../../src/display-width';
import { markElementRefRaw } from '../../src/raw-element';
import { normalizeBoolean } from '../../src/ui';
import { installPlainButtonStyles } from '../../src/ui.styles';

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
export class DialogComponent {
    constructor(@Optional() protected elementRef?: ElementRef) {
        markElementRefRaw(elementRef);
    }

    onInit(): void {
        // Every browser host gets the same bare ✕/action chrome as the terminal
        // surface without having to adopt the full UI skin.
        installPlainButtonStyles((this.elementRef?.nativeElement as { ownerDocument?: Document } | undefined)?.ownerDocument);
    }

    @Attribute() title = '';    @Attribute() lines: string[] = [];
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
            this.close();
        }
    }

    close(): void {
        this.closeAction?.();
    }
}
