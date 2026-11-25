import { Attribute, Component } from '@tsdi/components';
import { getDisplayWidth } from '../../src/display-width';
import { normalizeBoolean } from '../../src/ui';

/**
 * Renderer-neutral alert dialog. Uses the shared dialog chrome classes but
 * carries a semantic tone and a primary acknowledgement action, so hosts do
 * not have to clone modal markup for notices and confirmations.
 */
@Component({
    selector: 'alert-dialog, ui-alert-dialog',
    template: `
    <div class="console-panel dialog-panel alert-dialog {{widthClass}}"
        role="alertdialog" aria-modal="{{modal}}" data-tone="{{tone}}" aria-label="{{ariaLabel}}"
        aria-labelledby="{{ariaLabelledby}}" aria-describedby="{{ariaDescribedby}}"
        @keydown="handleKeydown($event)">
        <button class="dialog-close ui-plain-button" type="button" data-plain="true" data-cell-width="2"
            aria-label="{{closeLabel}}" v-if="closable" @click="close">{{closeLabel}}</button>
        <label class="dialog-title" v-if="title">{{title}}</label>
        <div class="dialog-body" [style]="scrollStyle">
            <label class="dialog-line" v-for="line in lines">{{line}}</label>
        </div>
        <label class="dialog-hint" v-if="hint">{{hint}}</label>
        <button class="alert-action ui-plain-button" type="button" data-plain="true" data-cell-width="2"
            aria-label="{{actionLabel}}" @click="accept">{{actionLabel}}</button>
    </div>`
})
export class AlertDialogComponent {
    @Attribute() title = '';
    @Attribute() lines: string[] = [];
    @Attribute() hint = '';
    @Attribute() tone: 'info' | 'success' | 'warning' | 'error' = 'info';
    @Attribute() ariaLabel = '';
    @Attribute() closeLabel = '✕';
    @Attribute() actionLabel = 'OK';
    @Attribute() maxWidth = 88;
    @Attribute() minWidth = 24;
    @Attribute() horizontalChrome = 6;
    /** Viewport guard for long alert content; empty disables the scroll box. */
    @Attribute() maxHeight = '60vh';
    @Attribute() closeAction?: () => void;
    @Attribute() acceptAction?: () => void;
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

    get widthClass(): string {
        return `dialog-w-${this.resolveContentWidth()}`;
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

    accept(): void {
        this.acceptAction?.();
    }

    protected resolveContentWidth(): number {
        const max = Math.max(8, Number(this.maxWidth) || 88);
        const min = Math.max(8, Math.min(max, Number(this.minWidth) || 24));
        const chrome = Math.max(0, Number(this.horizontalChrome) || 0);
        const longest = Math.max(
            0,
            getDisplayWidth(String(this.title || '')),
            getDisplayWidth(String(this.hint || '')),
            getDisplayWidth(String(this.actionLabel || '')),
            ...(this.lines || []).map(line => getDisplayWidth(String(line || '')))
        );
        return Math.max(min, Math.min(max, longest + chrome));
    }
}
