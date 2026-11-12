import { Attribute, Component } from '@tsdi/components';

/** Renderer-neutral Markdown token used by native tables/code surfaces. */
export interface MarkdownToken {
    text: string;
    tone?: string;
}

export interface MarkdownTableCell {
    tokens: MarkdownToken[];
    align?: string;
}

/**
 * Semantic table shell shared by DOM hosts. The terminal renderer can consume
 * the same cell model and paint its own grid; no host-specific markup lives in
 * agent-ui.
 */
@Component({
    selector: 'markdown-table',
    template: `
    <div class="markdown-table" role="table">
        <div class="markdown-row markdown-head" role="row">
            <div class="markdown-cell align-{{cell.align || 'left'}}" role="columnheader" v-for="cell in header"><span class="markdown-token" data-tone="{{token.tone}}" v-for="token in cell.tokens">{{token.text}}</span></div>
        </div>
        <div class="markdown-row" role="row" v-for="row in rows">
            <div class="markdown-cell align-{{cell.align || 'left'}}" role="cell" v-for="cell in row"><span class="markdown-token" data-tone="{{token.tone}}" v-for="token in cell.tokens">{{token.text}}</span></div>
        </div>
    </div>`
})
export class MarkdownTableComponent {
    @Attribute() header: MarkdownTableCell[] = [];
    @Attribute() rows: MarkdownTableCell[][] = [];
}

/** Semantic code shell; hosts own the surrounding language/copy chrome. */
@Component({
    selector: 'markdown-code',
    template: `
    <pre class="markdown-code"><code><span class="markdown-code-line" v-for="line in lines"><span class="markdown-code-token" data-tone="{{token.tone}}" v-for="token in line">{{token.text}}</span></span></code></pre>`
})
export class MarkdownCodeComponent {
    @Attribute() lines: MarkdownToken[][] = [];
}
