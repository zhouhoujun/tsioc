import { Attribute, Component } from '@tsdi/components';

/**
 * Renderer-neutral dialog shell: title, body lines, hint and a glyph-only close
 * target. Hosts own the content and overlay placement; html/console renderers
 * own the visual chrome.
 */
@Component({
    selector: 'common-dialog',
    template: `
    <div class="console-panel common-dialog" role="dialog" aria-label="{{ariaLabel}}" v-style="shellStyle">
        <label class="dialog-close" data-cell-width="2" v-style="closeStyle" @click="close">{{closeLabel}}</label>
        <label class="common-dialog-title" v-style="titleStyle" v-show="title">{{title}}</label>
        <label class="common-dialog-line" v-for="line in lines" v-style="lineStyle">{{line}}</label>
        <label class="common-dialog-hint" v-style="hintStyle" v-show="hint">{{hint}}</label>
    </div>`
})
export class CommonDialogComponent {
    @Attribute() title = '';
    @Attribute() lines: string[] = [];
    @Attribute() hint = '';
    @Attribute() ariaLabel = '';
    @Attribute() closeLabel = '✕';
    @Attribute() shellStyle: Record<string, string> = {};
    @Attribute() titleStyle: Record<string, string> = {};
    @Attribute() lineStyle: Record<string, string> = {};
    @Attribute() hintStyle: Record<string, string> = {};
    @Attribute() closeStyle: Record<string, string> = {};
    @Attribute() closeAction?: () => void;

    close(): void {
        this.closeAction?.();
    }
}
