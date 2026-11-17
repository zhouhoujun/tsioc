import {
    AfterContentInit,
    Attribute,
    Component,
    ContentChildren,
    ElementRef,
    EventEmitter,
    NodeType,
    OnDestroy,
    QueryList,
    RNode
} from '@tsdi/components';

/** One detail row rendered by {@link PanelComponent}. */
export interface PanelItem {
    lineNumber?: string;
    prefix?: string;
    text: string;
    className?: string;
    numberClass?: string;
    prefixClass?: string;
    contentClass?: string;
}

/** @deprecated Use {@link PanelItem}. */
export type PanelLineItem = PanelItem;

/** Optional per-part inline skin, supplied by DOM/TUI hosts. */
export interface PanelStyles {
    shell?: Record<string, string>;
    header?: Record<string, string>;
    summary?: Record<string, string>;
    body?: Record<string, string>;
    meta?: Record<string, string>;
    selection?: Record<string, string>;
    hint?: Record<string, string>;
    line?: Record<string, string>;
    number?: Record<string, string>;
    prefix?: Record<string, string>;
    content?: Record<string, string>;
    toggle?: Record<string, string>;
}

@Component({
    selector: 'panel',
    template: `
    <div class="console-panel console-base-panel" [style]="shellStyle">
        <label class="panel-header" [style]="headerStyle" @click="toggle" v-for="index in headerIndexes">{{headerLineAt(index)}}</label>
        <label class="panel-summary" [style]="summaryStyle" @click="toggle" v-show="!expanded" v-for="index in summaryIndexes">{{summaryLineAt(index)}}</label>
        <label class="panel-body" [style]="bodyStyle" v-show="bodyVisible" v-for="index in bodyIndexes">{{bodyLineAt(index)}}</label>
        <label class="detail-summary" [style]="summaryStyle" v-show="summary">{{summary}}</label>
        <label class="detail-meta" [style]="metaStyle" v-show="meta">{{meta}}</label>
        <label class="detail-selection" [style]="selectionStyle" v-show="selection">{{selection}}</label>
        <label class="detail-hint" [style]="hintStyle" v-show="hint">{{hint}}</label>
        <label class="detail-line {{item.className}}" [style]="lineStyle" v-for="item in items">
            <span class="detail-line-number {{item.numberClass}}" [style]="numberStyle" v-show="item.lineNumber">{{item.lineNumber}}</span><span class="detail-line-prefix {{item.prefixClass}}" [style]="prefixStyle" v-show="item.prefix">{{item.prefix}}</span><span class="detail-line-content {{item.contentClass}}" [style]="contentStyle">{{item.text}}</span>
        </label>
        <label class="panel-toggle" [style]="toggleStyle" @click="toggle" v-show="hasSummary">{{toggleLabel}}</label>
    </div>`
})
export class PanelComponent {
    private _expanded = false;
    private _locale: 'zh-CN' | 'en' = 'zh-CN';
    private _expandText = '';
    private _collapseText = '';

    @Attribute() get expanded(): boolean { return this._expanded; }
    set expanded(value: boolean | string) {
        const next = value === '' || value === true || value === 'true';
        if (next === this._expanded) {
            return;
        }
        this._expanded = next;
        this.expandedChange.emit(next);
    }
    @Attribute() expandedChange = new EventEmitter<boolean>();
    @Attribute() get locale(): 'zh-CN' | 'en' { return this._locale; }
    set locale(value: string) { this._locale = String(value || '').toLowerCase().startsWith('en') ? 'en' : 'zh-CN'; }
    @Attribute() get expandText(): string { return this._expandText || (this._locale === 'en' ? 'Click to expand' : '点击展开'); }
    set expandText(value: string) { this._expandText = String(value || '').trim(); }
    @Attribute() get collapseText(): string { return this._collapseText || (this._locale === 'en' ? 'Click to collapse' : '点击折叠'); }
    set collapseText(value: string) { this._collapseText = String(value || '').trim(); }
    /** Read-only detail projection (inspector/list side panels). */
    @Attribute() summary = '';
    @Attribute() meta = '';
    @Attribute() selection = '';
    @Attribute() hint = '';
    @Attribute() items: PanelItem[] = [];
    /** Optional per-part inline skin (DOM/TUI hosts share the same object). */
    @Attribute() styles?: PanelStyles;

    /** Projected slot nodes, resolved through the content-query index. */
    @ContentChildren('panel-header') headerNodes?: QueryList<ElementRef>;
    @ContentChildren('panel-summary') summaryNodes?: QueryList<ElementRef>;
    @ContentChildren('panel-body') bodyNodes?: QueryList<ElementRef>;

    protected projectionVersion = 0;
    private changeSubscriptions: Array<{ unsubscribe(): void }> = [];

    get shellStyle(): Record<string, string> | undefined { return this.styles?.shell; }
    get headerStyle(): Record<string, string> | undefined { return this.styles?.header; }
    get summaryStyle(): Record<string, string> | undefined { return this.styles?.summary; }
    get bodyStyle(): Record<string, string> | undefined { return this.styles?.body; }
    get metaStyle(): Record<string, string> | undefined { return this.styles?.meta; }
    get selectionStyle(): Record<string, string> | undefined { return this.styles?.selection; }
    get hintStyle(): Record<string, string> | undefined { return this.styles?.hint; }
    get lineStyle(): Record<string, string> | undefined { return this.styles?.line; }
    get numberStyle(): Record<string, string> | undefined { return this.styles?.number; }
    get prefixStyle(): Record<string, string> | undefined { return this.styles?.prefix; }
    get contentStyle(): Record<string, string> | undefined { return this.styles?.content; }
    get toggleStyle(): Record<string, string> | undefined { return this.styles?.toggle; }

    get headerLines(): string[] { void this.projectionVersion; return this.collectSlot(this.headerNodes); }
    get summaryLines(): string[] { void this.projectionVersion; return this.collectSlot(this.summaryNodes); }
    get bodyLines(): string[] { void this.projectionVersion; return this.collectSlot(this.bodyNodes); }
    get hasSummary(): boolean { return this.summaryLines.length > 0; }
    get bodyVisible(): boolean { return !this.hasSummary || this._expanded; }
    get toggleLabel(): string { return this._expanded ? this.collapseText : this.expandText; }
    get headerIndexes(): number[] { return this.indexes(this.headerLines); }
    get summaryIndexes(): number[] { return this.indexes(this._expanded ? [] : this.summaryLines); }
    get bodyIndexes(): number[] { return this.indexes(this.bodyVisible ? this.bodyLines : []); }

    onAfterContentInit(): void {
        [this.headerNodes, this.summaryNodes, this.bodyNodes].forEach(list => {
            const subscription = list?.changes.subscribe(() => {
                this.projectionVersion += 1;
            });
            if (subscription) {
                this.changeSubscriptions.push(subscription);
            }
        });
    }

    onDestroy(): void {
        this.changeSubscriptions.forEach(subscription => subscription.unsubscribe());
        this.changeSubscriptions = [];
    }

    headerLineAt(index: number): string {
        const line = this.headerLines[index] || '';
        return index === 0 && this.hasSummary ? `${this._expanded ? '▾' : '▸'} ${line}` : line;
    }
    summaryLineAt(index: number): string { return this.summaryLines[index] || ''; }
    bodyLineAt(index: number): string { return this.bodyLines[index] || ''; }
    toggle(): void {
        if (!this.hasSummary) return;
        this.expanded = !this._expanded;
    }

    protected indexes(lines: string[]): number[] { return Array.from({ length: lines.length }, (_value, index) => index); }
    protected collectSlot(query?: QueryList<ElementRef>): string[] {
        const lines: string[] = [];
        query?.toArray().forEach(ref => this.collectContentText(ref?.nativeElement as RNode, lines));
        return lines;
    }
    protected collectContentText(node: RNode | null | undefined, lines: string[]): void {
        if (!node) return;
        if (node.nodeType === NodeType.Text || node.nodeType === NodeType.Comment) {
            String((node as any).textContent || '').split('\n').map(line => line.trim()).filter(Boolean).forEach(line => lines.push(line));
            return;
        }
        const children = node.childNodes;
        if (children?.length) children.forEach(child => this.collectContentText(child, lines));
        else String((node as any).textContent || '').split('\n').map(line => line.trim()).filter(Boolean).forEach(line => lines.push(line));
    }
}

