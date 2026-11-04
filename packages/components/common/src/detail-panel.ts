import { Attribute, Component } from '@tsdi/components';


export interface DetailLineItem {
    lineNumber?: string;
    prefix?: string;
    text: string;
    className?: string;
    numberClass?: string;
    prefixClass?: string;
    contentClass?: string;
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
        <label class="detail-line {{item.className}}" v-for="item in items">
            <span class="detail-line-number" v-show="item.lineNumber">{{item.lineNumber}}</span><span class="detail-line-prefix {{item.prefixClass}}" v-show="item.prefix">{{item.prefix}}</span><span class="detail-line-content {{item.contentClass}}">{{item.text}}</span>
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
