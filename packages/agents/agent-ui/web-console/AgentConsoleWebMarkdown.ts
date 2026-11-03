import { Component } from '@tsdi/components';
import { MarkdownCodeComponent, MarkdownTableComponent } from '@tsdi/components/common';
import type { AgentConsoleMarkdownToken, AgentConsoleRenderedLine } from '@tsdi/agent-ui';
import { AgentConsoleMarkdownComponent, AgentConsoleRoutedTokensComponent } from '@tsdi/agent-ui';

/**
 * Browser-only Markdown surface.
 *
 * The shared markdown model/tokens stay in AgentConsoleMarkdown; this component
 * owns the DOM-specific table/code layout and browser interactions. The TUI
 * keeps AgentConsoleMarkdownComponent unchanged.
 */
interface AgentConsoleWebTableCell {
    tokens: AgentConsoleMarkdownToken[];
    align: string;
}

interface AgentConsoleWebMarkdownSegment {
    kind: 'text' | 'table' | 'code';
    isText: boolean;
    isTable: boolean;
    isCode: boolean;
    lines: AgentConsoleRenderedLine[];
    tableHeader?: AgentConsoleWebTableCell[];
    tableRows?: AgentConsoleWebTableCell[][];
    tableData?: AgentConsoleRenderedLine['tableData'];
    codeData?: AgentConsoleRenderedLine['codeData'];
}

const WEB_MARKDOWN_TEMPLATE = `
    <div class="message-block-spacing" v-if="spacerBefore">​</div>
    <div class="message-markdown message-template-assistant" data-template-kind="{{templateKind}}" data-semantic-kind="{{semanticKind}}" data-status="{{item.statusKind}}" v-style="blockStyle">
        <div class="markdown-web-segment" v-for="segment in webSegments">
            <common-markdown-table v-if="segment.isTable" :header="segment.tableHeader" :rows="segment.tableRows"></common-markdown-table>
            <div class="web-code-block" v-if="segment.isCode">
                <div class="web-code-head">
                    <span>{{segment.codeData.language || 'code'}}</span>
                    <button type="button" @click="copyCode(segment.codeData.text, $event)">{{copyLabel}}</button>
                </div>
                <common-markdown-code :lines="segment.codeData.lines || []"></common-markdown-code>
            </div>
            <div class="web-markdown-text" v-if="segment.isText">
                <label class="message-line markdown-line" v-for="line in segment.lines" v-style="line.itemStyle" aria-label="{{line.ariaLabel}}" continuationIndent="{{line.continuationIndent}}" data-code="{{line.code}}" data-table="{{line.table}}">
                    <span v-style="line.statusStyle">{{line.status}}</span>
                    <span v-style="line.roleStyle" v-show="line.role">{{line.role}}</span>
                    <span v-style="line.metaStyle" v-show="line.meta">{{line.meta}}</span>
                    <span v-style="line.prefixStyle" v-show="line.prefix">{{line.prefix}}</span>
                    <span v-style="line.lineStyle" v-if="!line.toggleContent || line.content !== line.toggleContent"><agent-console-routed-tokens :tokens="line.tokens"></agent-console-routed-tokens></span>
                    <span class="message-detail-toggle" v-style="line.lineStyle" v-if="line.toggleContent" @click="toggleMessageDetail(line)">{{line.toggleContent}}</span>
                </label>
            </div>
        </div>
    </div>
`;

@Component({
    selector: 'agent-console-web-markdown',
    template: WEB_MARKDOWN_TEMPLATE,
    imports: [AgentConsoleRoutedTokensComponent, MarkdownTableComponent, MarkdownCodeComponent]
})
export class AgentConsoleWebMarkdownComponent extends AgentConsoleMarkdownComponent {
    get webSegments(): AgentConsoleWebMarkdownSegment[] {
        const segments: AgentConsoleWebMarkdownSegment[] = [];
        for (const line of this.lines) {
            const kind: AgentConsoleWebMarkdownSegment['kind'] = line.table
                ? 'table'
                : line.code
                    ? 'code'
                    : 'text';
            const previous = segments[segments.length - 1];
            if (previous && previous.kind === kind && kind === 'text') {
                previous.lines.push(line);
                continue;
            }
            if (previous && previous.kind === kind && kind !== 'text') {
                previous.lines.push(line);
                continue;
            }
            const tableData = kind === 'table' ? (line.tableData || { header: [], rows: [], aligns: [], headerTokens: [], rowTokens: [] }) : undefined;
            const tableCell = (text: string, index: number, tokens?: AgentConsoleMarkdownToken[][]): AgentConsoleWebTableCell => ({
                tokens: tokens?.[index] || [{ text }],
                align: tableData?.aligns[index] || 'left'
            });
            segments.push({
                kind,
                isText: kind === 'text',
                isTable: kind === 'table',
                isCode: kind === 'code',
                lines: [line],
                tableHeader: tableData ? tableData.header.map((cell, index) => tableCell(cell, index, tableData.headerTokens)) : undefined,
                tableRows: tableData ? tableData.rows.map((row, rowIndex) => row.map((cell, index) => tableCell(cell, index, tableData.rowTokens?.[rowIndex]))) : undefined,
                tableData,
                codeData: kind === 'code' ? (line.codeData || { text: '' }) : undefined
            });
        }
        return segments;
    }

    get copyLabel(): string { return this.translator?.translate('agent.message.copyCode') || 'Copy'; }
    get copiedLabel(): string { return this.translator?.translate('agent.message.copiedCode') || 'Copied'; }

    async copyCode(text: string, event?: { target?: { textContent?: string | null } }): Promise<void> {
        const clipboard = (globalThis as { navigator?: { clipboard?: { writeText?(value: string): Promise<void> } } }).navigator?.clipboard;
        try {
            await clipboard?.writeText?.(String(text || ''));
        } catch {
            // Clipboard permission can be denied; the code block remains selectable.
        }
        const button = event?.target;
        if (!button) {
            return;
        }
        const original = button.textContent;
        button.textContent = this.copiedLabel;
        (globalThis as { setTimeout?: (fn: () => void, delay: number) => unknown }).setTimeout?.(() => {
            button.textContent = original;
        }, 1500);
    }
}
