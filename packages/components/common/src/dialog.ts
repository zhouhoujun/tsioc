import { Attribute, Component } from '@tsdi/components';
import { getDisplayWidth } from './display-width';

/**
 * Renderer-neutral dialog shell: title, body lines, hint and a glyph-only close
 * target. Hosts own the content and overlay placement; html/console renderers
 * own the visual chrome.
 */
@Component({
    selector: 'common-dialog',
    template: `
    <div class="console-panel common-dialog" role="dialog" aria-label="{{ariaLabel}}" [style]="resolvedShellStyle">
        <label class="dialog-close" data-cell-width="2" @click="close">{{closeLabel}}</label>
        <label class="common-dialog-title" v-show="title">{{title}}</label>
        <label class="common-dialog-line" v-for="line in lines">{{line}}</label>
        <label class="common-dialog-hint" v-show="hint">{{hint}}</label>
    </div>`
})
export class DialogComponent {
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
    @Attribute() closeAction?: () => void;

    get resolvedShellStyle(): string {
        return `max-width: ${this.resolveContentWidth()}ch;`;
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

    close(): void {
        this.closeAction?.();
    }
}
