import { Attribute, Component } from '@tsdi/components';

/** Renderer-neutral Markdown token used by native tables/code surfaces. */
export interface CommonMarkdownToken {
    text: string;
    tone?: string;
}

export interface CommonMarkdownTableCell {
    tokens: CommonMarkdownToken[];
    align?: string;
}

/**
 * Semantic table shell shared by DOM hosts. The terminal renderer can consume
 * the same cell model and paint its own grid; no host-specific markup lives in
 * agent-ui.
 */
@Component({
    selector: 'common-markdown-table',
    template: `
    <div class="common-markdown-table" role="table">
        <div class="common-markdown-row common-markdown-head" role="row">
            <div class="common-markdown-cell align-{{cell.align || 'left'}}" role="columnheader" v-for="cell in header"><span class="common-markdown-token" data-tone="{{token.tone}}" v-for="token in cell.tokens">{{token.text}}</span></div>
        </div>
        <div class="common-markdown-row" role="row" v-for="row in rows">
            <div class="common-markdown-cell align-{{cell.align || 'left'}}" role="cell" v-for="cell in row"><span class="common-markdown-token" data-tone="{{token.tone}}" v-for="token in cell.tokens">{{token.text}}</span></div>
        </div>
    </div>`
})
export class MarkdownTableComponent {
    @Attribute() header: CommonMarkdownTableCell[] = [];
    @Attribute() rows: CommonMarkdownTableCell[][] = [];
}

/** Semantic code shell; hosts own the surrounding language/copy chrome. */
@Component({
    selector: 'common-markdown-code',
    template: `
    <pre class="common-markdown-code"><code><span class="common-markdown-code-line" v-for="line in lines"><span class="common-markdown-code-token" data-tone="{{token.tone}}" v-for="token in line">{{token.text}}</span></span></code></pre>`
})
export class MarkdownCodeComponent {
    @Attribute() lines: CommonMarkdownToken[][] = [];
}
