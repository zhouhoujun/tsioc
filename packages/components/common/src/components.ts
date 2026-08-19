import {
    Attribute,
    Component,
    ElementRef,
    EventEmitter,
    NodeType,
    PROJECTION_NODES,
    RNode
} from '@tsdi/components';
import { Module, Optional } from '@tsdi/ioc';

interface CommonProjectionNode extends RNode {
    tagName?: string;
    textContent?: string | null;
    [PROJECTION_NODES]?: RNode[];
}

@Component({
    selector: 'panel',
    template: `
    <div class="console-panel console-base-panel" v-style="shellStyle">
        <label class="panel-header" v-style="headerStyle" @click="toggle" v-for="index in headerIndexes">{{headerLineAt(index)}}</label>
        <label class="panel-summary" v-style="summaryStyle" @click="toggle" v-show="!expanded" v-for="index in summaryIndexes">{{summaryLineAt(index)}}</label>
        <label class="panel-body" v-style="bodyStyle" v-show="bodyVisible" v-for="index in bodyIndexes">{{bodyLineAt(index)}}</label>
        <label class="panel-toggle" v-style="toggleStyle" @click="toggle" v-show="hasSummary">{{toggleLabel}}</label>
    </div>`
})
export class PanelComponent {
    private _expanded = false;
    private _locale: 'zh-CN' | 'en' = 'zh-CN';
    private _expandText = '';
    private _collapseText = '';

    constructor(@Optional() protected elementRef?: ElementRef) {}

    @Attribute() get expanded(): boolean { return this._expanded; }
    set expanded(value: boolean | string) { this._expanded = value === '' || value === true || value === 'true'; }
    @Attribute() expandedChange = new EventEmitter<boolean>();
    @Attribute() get locale(): 'zh-CN' | 'en' { return this._locale; }
    set locale(value: string) { this._locale = String(value || '').toLowerCase().startsWith('en') ? 'en' : 'zh-CN'; }
    @Attribute() get expandText(): string { return this._expandText || (this._locale === 'en' ? 'Click to expand' : '点击展开'); }
    set expandText(value: string) { this._expandText = String(value || '').trim(); }
    @Attribute() get collapseText(): string { return this._collapseText || (this._locale === 'en' ? 'Click to collapse' : '点击折叠'); }
    set collapseText(value: string) { this._collapseText = String(value || '').trim(); }

    get headerLines(): string[] { return this.collectProjectionSlot('panel-header'); }
    get summaryLines(): string[] { return this.collectProjectionSlot('panel-summary'); }
    get bodyLines(): string[] { return this.collectProjectionSlot('panel-body'); }
    get hasSummary(): boolean { return this.summaryLines.length > 0; }
    get bodyVisible(): boolean { return !this.hasSummary || this._expanded; }
    get toggleLabel(): string { return this._expanded ? this.collapseText : this.expandText; }
    get shellStyle(): string { return 'background: #10161d; color: #d6dee6; padding: 1; border: 1px solid #2a3441;'; }
    get headerIndexes(): number[] { return this.indexes(this.headerLines); }
    get summaryIndexes(): number[] { return this.indexes(this._expanded ? [] : this.summaryLines); }
    get bodyIndexes(): number[] { return this.indexes(this.bodyVisible ? this.bodyLines : []); }
    get headerStyle(): Record<string, string> { return { color: '#f3f6fb', 'font-weight': 'bold', cursor: this.hasSummary ? 'pointer' : 'default' }; }
    get summaryStyle(): Record<string, string> { return { color: '#6f7c8a', cursor: 'pointer' }; }
    get bodyStyle(): Record<string, string> { return { color: '#d6dee6', 'white-space': 'pre-wrap', 'overflow-wrap': 'anywhere' }; }
    get toggleStyle(): Record<string, string> { return { color: '#6f7c8a', cursor: 'pointer' }; }

    headerLineAt(index: number): string {
        const line = this.headerLines[index] || '';
        return index === 0 && this.hasSummary ? `${this._expanded ? '▾' : '▸'} ${line}` : line;
    }
    summaryLineAt(index: number): string { return this.summaryLines[index] || ''; }
    bodyLineAt(index: number): string { return this.bodyLines[index] || ''; }
    toggle(): void {
        if (!this.hasSummary) return;
        this._expanded = !this._expanded;
        this.expandedChange.emit(this._expanded);
    }

    protected indexes(lines: string[]): number[] { return Array.from({ length: lines.length }, (_value, index) => index); }
    protected collectProjectionSlot(tagName: string): string[] {
        const lines: string[] = [];
        this.resolveProjectedContent()
            .filter(node => String((node as CommonProjectionNode).tagName || '').toLowerCase() === tagName)
            .forEach(node => this.collectContentText(node, lines));
        return lines;
    }
    protected resolveProjectedContent(): RNode[] {
        const nodes = (this.elementRef?.nativeElement as CommonProjectionNode | undefined)?.[PROJECTION_NODES];
        return nodes?.length ? nodes : [];
    }
    protected collectContentText(node: RNode | null | undefined, lines: string[]): void {
        if (!node) return;
        if (node.nodeType === NodeType.Text || node.nodeType === NodeType.Comment) {
            String((node as CommonProjectionNode).textContent || '').split('\n').map(line => line.trim()).filter(Boolean).forEach(line => lines.push(line));
            return;
        }
        const children = node.childNodes;
        if (children?.length) children.forEach(child => this.collectContentText(child, lines));
        else String((node as CommonProjectionNode).textContent || '').split('\n').map(line => line.trim()).filter(Boolean).forEach(line => lines.push(line));
    }
}

@Module({
    declarations: [PanelComponent],
    exports: [PanelComponent]
})
export class CommonComponentsModule {}
