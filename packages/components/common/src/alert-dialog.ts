import { Attribute, Component } from '@tsdi/components';
import { getDisplayWidth } from './display-width';

/**
 * Renderer-neutral alert dialog. Uses the shared dialog chrome classes but
 * carries a semantic tone and a primary acknowledgement action, so hosts do
 * not have to clone modal markup for notices and confirmations.
 */
@Component({
    selector: 'alert-dialog',
    template: `
    <div class="console-panel dialog-panel alert-dialog {{widthClass}}" role="alertdialog" data-tone="{{tone}}" aria-label="{{ariaLabel}}">
        <label class="dialog-close" data-cell-width="2" @click="close">{{closeLabel}}</label>
        <label class="dialog-title" v-if="title">{{title}}</label>
        <label class="dialog-line" v-for="line in lines">{{line}}</label>
        <label class="dialog-hint" v-if="hint">{{hint}}</label>
        <label class="alert-action" data-cell-width="2" @click="accept">{{actionLabel}}</label>
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
    @Attribute() closeAction?: () => void;
    @Attribute() acceptAction?: () => void;

    get widthClass(): string {
        return `dialog-w-${this.resolveContentWidth()}`;
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
