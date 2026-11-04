import { Attribute, Component } from '@tsdi/components';


export interface DetailLineItem {
    lineNumber?: string;
    prefix?: string;
    text: string;
    style?: Record<string, string> | string;
    numberStyle?: Record<string, string> | string;
    prefixStyle?: Record<string, string> | string;
    contentStyle?: Record<string, string> | string;
}

/**
 * Renderer-neutral detail view: header, meta/selection lines, key hint and
 * optionally line-numbered content rows. Hosts provide the window and styles.
 */
@Component({
    selector: 'detail-panel',
    template: `
    <div class="console-panel detail-panel" >
        <label class="detail-summary"  v-show="summary">{{summary}}</label>
        <label class="detail-meta"  v-show="meta">{{meta}}</label>
        <label class="detail-selection"  v-show="selection">{{selection}}</label>
        <label class="detail-hint"  v-show="hint">{{hint}}</label>
        <label class="detail-line" v-style="item.style" v-for="item in items">
            <span v-show="item.lineNumber" v-style="item.numberStyle">{{item.lineNumber}}</span><span v-show="item.prefix" v-style="item.prefixStyle">{{item.prefix}}</span><span v-style="item.contentStyle">{{item.text}}</span>
        </label>
    </div>`
})
export class DetailPanelComponent {
    @Attribute() summary = '';
    @Attribute() meta = '';
    @Attribute() selection = '';
    @Attribute() hint = '';
    @Attribute() items: DetailLineItem[] = [];
}
