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
import { TabBarComponent } from './tab-bar';
import { MarkdownCodeComponent, MarkdownTableComponent } from './markdown';
import { DialogComponent } from './dialog';
import { AlertDialogComponent } from './alert-dialog';
import { ToastStackComponent } from './toast-stack';
import { SelectComponent } from './select';
import { ListPanelComponent } from './list-panel';
import { ListComponent } from './list';
import { KeymapPanelComponent } from './keymap-panel';
import { StatusListComponent } from './status-list';
import { MessageRowComponent } from './message-row';
import { DetailPanelComponent } from './detail-panel';
import { InputFieldComponent } from './input-field';
import { WorkspaceLayoutComponent } from './workspace-layout';
import { GridLayoutComponent, GridItemComponent } from './grid-layout';
import { ThemeService } from './theme';

interface ProjectionNode extends RNode {
    tagName?: string;
    textContent?: string | null;
    [PROJECTION_NODES]?: RNode[];
}

@Component({
    selector: 'panel',
    template: `
    <div class="console-panel console-base-panel" >
        <label class="panel-header"  @click="toggle" v-for="index in headerIndexes">{{headerLineAt(index)}}</label>
        <label class="panel-summary"  @click="toggle" v-show="!expanded" v-for="index in summaryIndexes">{{summaryLineAt(index)}}</label>
        <label class="panel-body"  v-show="bodyVisible" v-for="index in bodyIndexes">{{bodyLineAt(index)}}</label>
        <label class="panel-toggle"  @click="toggle" v-show="hasSummary">{{toggleLabel}}</label>
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
    get headerIndexes(): number[] { return this.indexes(this.headerLines); }
    get summaryIndexes(): number[] { return this.indexes(this._expanded ? [] : this.summaryLines); }
    get bodyIndexes(): number[] { return this.indexes(this.bodyVisible ? this.bodyLines : []); }

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
            .filter(node => String((node as ProjectionNode).tagName || '').toLowerCase() === tagName)
            .forEach(node => this.collectContentText(node, lines));
        return lines;
    }
    protected resolveProjectedContent(): RNode[] {
        const nodes = (this.elementRef?.nativeElement as ProjectionNode | undefined)?.[PROJECTION_NODES];
        return nodes?.length ? nodes : [];
    }
    protected collectContentText(node: RNode | null | undefined, lines: string[]): void {
        if (!node) return;
        if (node.nodeType === NodeType.Text || node.nodeType === NodeType.Comment) {
            String((node as ProjectionNode).textContent || '').split('\n').map(line => line.trim()).filter(Boolean).forEach(line => lines.push(line));
            return;
        }
        const children = node.childNodes;
        if (children?.length) children.forEach(child => this.collectContentText(child, lines));
        else String((node as ProjectionNode).textContent || '').split('\n').map(line => line.trim()).filter(Boolean).forEach(line => lines.push(line));
    }
}

@Module({
    providers: [ThemeService],
    declarations: [PanelComponent, TabBarComponent, MarkdownTableComponent, MarkdownCodeComponent, DialogComponent, AlertDialogComponent, ToastStackComponent, SelectComponent, ListPanelComponent, ListComponent, KeymapPanelComponent, StatusListComponent, MessageRowComponent, DetailPanelComponent, InputFieldComponent, WorkspaceLayoutComponent, GridLayoutComponent, GridItemComponent],
    exports: [PanelComponent, TabBarComponent, MarkdownTableComponent, MarkdownCodeComponent, DialogComponent, AlertDialogComponent, ToastStackComponent, SelectComponent, ListPanelComponent, ListComponent, KeymapPanelComponent, StatusListComponent, MessageRowComponent, DetailPanelComponent, InputFieldComponent, WorkspaceLayoutComponent, GridLayoutComponent, GridItemComponent]
})
export class BaseComponentsModule {}
