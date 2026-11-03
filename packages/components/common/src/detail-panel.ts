import { Attribute, Component } from '@tsdi/components';

export interface DetailPanelStyles {
    shell?: Record<string, string> | string;
    header?: Record<string, string> | string;
    meta?: Record<string, string> | string;
    selection?: Record<string, string> | string;
    hint?: Record<string, string> | string;
    line?: Record<string, string> | string;
    number?: Record<string, string> | string;
    content?: Record<string, string> | string;
}

export interface DetailLineItem {
    lineNumber?: string;
    text: string;
    style?: Record<string, string> | string;
    numberStyle?: Record<string, string> | string;
    contentStyle?: Record<string, string> | string;
}

/**
 * Renderer-neutral detail view: header, meta/selection lines, key hint and
 * optionally line-numbered content rows. Hosts provide the window and styles.
 */
@Component({
    selector: 'detail-panel',
    template: `
    <div class="console-panel detail-panel" v-style="styles.shell">
        <label class="detail-summary" v-style="styles.header" v-show="summary">{{summary}}</label>
        <label class="detail-meta" v-style="styles.meta" v-show="meta">{{meta}}</label>
        <label class="detail-selection" v-style="styles.selection" v-show="selection">{{selection}}</label>
        <label class="detail-hint" v-style="styles.hint" v-show="hint">{{hint}}</label>
        <label class="detail-line" v-style="item.style || styles.line" v-for="item in items">
            <span v-show="item.lineNumber" v-style="item.numberStyle || styles.number">{{item.lineNumber}}</span><span v-style="item.contentStyle || styles.content">{{item.text}}</span>
        </label>
    </div>`
})
export class DetailPanelComponent {
    @Attribute() summary = '';
    @Attribute() meta = '';
    @Attribute() selection = '';
    @Attribute() hint = '';
    @Attribute() items: DetailLineItem[] = [];
    @Attribute() styles: DetailPanelStyles = {};
}
