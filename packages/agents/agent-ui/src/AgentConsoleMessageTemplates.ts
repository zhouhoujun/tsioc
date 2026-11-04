import { Component, Attribute } from '@tsdi/components';
import { Optional } from '@tsdi/ioc';
import { TranslatorService } from '@tsdi/i18n';
import type { AgentConsoleRenderedMessageItem, AgentConsoleRenderedLine } from './AgentConsoleMessageRenderers';
import { AgentConsoleSessionState } from './AgentConsoleSessionState';

const ITEM_TEMPLATE = `
    <div class="message-block-spacing" v-if="spacerBefore">​</div>
    <div class="message-item-block {{templateClass}}" data-template-kind="{{templateKind}}" data-semantic-kind="{{semanticKind}}" data-status="{{item.statusKind}}" data-selected="{{item.selected}}">
        <div class="message-line-wrap" v-for="line in lines">
            <label class="message-line" v-if="line.toggleMode" data-tone="{{line.tone}}" aria-label="{{line.ariaLabel}}" continuationIndent="{{line.continuationIndent}}" data-hover="fade" @click="toggleMessageDetail(line)">
                <span class="message-status">{{line.status}}</span>
                <span class="message-role" v-show="line.role">{{line.role}}</span>
                <span class="message-meta" v-show="line.meta">{{line.meta}}</span>
                <span class="message-prefix" v-show="line.prefix">{{line.prefix}}</span>
                <span class="message-body"><agent-console-routed-tokens :tokens="line.tokens"></agent-console-routed-tokens></span>
            </label>
            <label class="message-line" v-else data-tone="{{line.tone}}" aria-label="{{line.ariaLabel}}" continuationIndent="{{line.continuationIndent}}" data-hover="none">
                <span class="message-status">{{line.status}}</span>
                <span class="message-role" v-show="line.role">{{line.role}}</span>
                <span class="message-meta" v-show="line.meta">{{line.meta}}</span>
                <span class="message-prefix" v-show="line.prefix">{{line.prefix}}</span>
                <span class="message-body"><agent-console-routed-tokens :tokens="line.tokens"></agent-console-routed-tokens></span>
            </label>
        </div>
    </div>
`;

const MARKDOWN_TEMPLATE = `
    <div class="message-block-spacing" v-if="spacerBefore">​</div>
    <div class="message-markdown {{templateClass}}" data-template-kind="{{templateKind}}" data-semantic-kind="{{semanticKind}}" data-status="{{item.statusKind}}" data-selected="{{item.selected}}">
        <label class="message-line markdown-line" v-for="line in lines" data-tone="{{line.tone}}" aria-label="{{line.ariaLabel}}" continuationIndent="{{line.continuationIndent}}" data-code="{{line.code}}" data-table="{{line.table}}">
            <span class="message-status">{{line.status}}</span>
            <span class="message-role" v-show="line.role">{{line.role}}</span>
            <span class="message-meta" v-show="line.meta">{{line.meta}}</span>
            <span class="message-prefix" v-show="line.prefix">{{line.prefix}}</span>
            <span class="message-body"><agent-console-routed-tokens :tokens="line.tokens"></agent-console-routed-tokens></span>
        </label>
    </div>
`;

const thoughtLinesCache = new WeakMap<object, {
    source: AgentConsoleRenderedLine[];
    selected: boolean;
    detailOpen: boolean;
    rawMode: boolean;
    showCriticalMarks: boolean;
    expandedIds: readonly string[];
    reasoningPreviewLines: number;
    lines: AgentConsoleRenderedLine[];
}>();

const bodyLinesCache = new WeakMap<object, {
    source: AgentConsoleRenderedLine[];
    selected: boolean;
    detailOpen: boolean;
    rawMode: boolean;
    showCriticalMarks: boolean;
    messageLayout: string;
    finalAssistantMessageId: string;
    expandedIds: readonly string[];
    previewLines: number;
    lines: AgentConsoleRenderedLine[];
}>();

@Component({
    selector: 'agent-console-routed-tokens',
    template: `
        <span class="message-content">
            <span class="message-token tone-{{token.tone}}" v-for="token in tokens">{{token.text}}</span>
        </span>
    `
})
export class AgentConsoleRoutedTokensComponent {
    @Attribute() tokens: AgentConsoleRenderedLine['tokens'] = [];
}

@Component({
    selector: 'agent-console-routed-line',
    imports: [AgentConsoleRoutedTokensComponent],
    template: `
        <label class="message-line" data-tone="{{line.tone}}" aria-label="{{ariaLabel}}" data-hover="{{line.toggleMode ? 'fade' : 'none'}}" @click="toggleMessageDetail()">
            <span class="message-status">{{status}}</span>
            <span class="message-role" v-show="role">{{role}}</span>
            <span class="message-meta" v-show="meta">{{meta}}</span>
            <span class="message-prefix" v-show="prefix">{{prefix}}</span>
            <span class="message-body">
                <agent-console-routed-tokens :tokens="tokens"></agent-console-routed-tokens>
            </span>
        </label>
    `
})
export class AgentConsoleRoutedLineComponent {
    @Attribute() line?: AgentConsoleRenderedLine;
    @Attribute() state!: AgentConsoleSessionState;

    get lineStyle() { return this.line?.itemStyle || {}; }
    get ariaLabel() { return this.line?.ariaLabel || ''; }
    get status() { return this.line?.status || ''; }
    get statusStyle() { return this.line?.statusStyle || {}; }
    get role() { return this.line?.role || ''; }
    get roleStyle() { return this.line?.roleStyle || {}; }
    get meta() { return this.line?.meta || ''; }
    get metaStyle() { return this.line?.metaStyle || {}; }
    get prefix() { return this.line?.prefix || ''; }
    get prefixStyle() { return this.line?.prefixStyle || {}; }
    get contentStyle() { return this.line?.lineStyle || {}; }
    get content() { return this.line?.content || ''; }
    get toggleContent() { return this.line?.toggleContent || ''; }
    get tokens() { return this.line?.tokens || []; }

    toggleMessageDetail(): void {
        const messageId = String(this.line?.messageId || '').trim();
        if (!messageId || !this.line?.toggleMode) return;
        this.state.setSelectedMessageId(messageId);
        if (this.line.toggleMode === 'detail') {
            if (this.state.messageDetailOpen) {
                this.state.closeMessageDetail();
            }
            return;
        }
        this.state.toggleMessageExpanded(messageId);
    }
}

export abstract class AgentConsoleMessageTemplateBase {
    @Attribute() item?: AgentConsoleRenderedMessageItem;
    @Attribute() state!: AgentConsoleSessionState;

    constructor(@Optional() protected translator?: TranslatorService) {}

    get lines(): AgentConsoleRenderedLine[] {
        return this.item?.lines || [];
    }

    /**
     * Viewport mode collapses long assistant/tool rows to a preview with an
     * expand toggle; the last assistant answer and explicit `stream` layout stay full.
     */
    protected bodyPreviewLines(source: AgentConsoleRenderedLine[], previewLines: number): AgentConsoleRenderedLine[] {
        const selected = !!this.item?.selected;
        const detailOpen = this.state.messageDetailOpen;
        const rawMode = this.state.rawMode;
        const showCriticalMarks = this.state.showCriticalMarks;
        const messageLayout = this.state.messageLayout;
        const finalAssistantMessageId = this.state.finalAssistantMessageId;
        const expandedIds = this.state.expandedMessageIds;
        const messageId = String(source[0]?.messageId || '');
        const cached = bodyLinesCache.get(this);
        if (cached
            && cached.source === source
            && cached.selected === selected
            && cached.detailOpen === detailOpen
            && cached.rawMode === rawMode
            && cached.showCriticalMarks === showCriticalMarks
            && cached.messageLayout === messageLayout
            && cached.finalAssistantMessageId === finalAssistantMessageId
            && cached.expandedIds === expandedIds
            && cached.previewLines === previewLines) {
            return cached.lines;
        }
        const expanded = rawMode || showCriticalMarks || messageLayout === 'scrollback'
            || (messageId && messageId === finalAssistantMessageId)
            || (messageId && this.state.isMessageExpanded(messageId))
            || (detailOpen && selected);
        const lines = expanded ? source.map(line => ({ ...line, toggleMode: 'inline' as const })) : this.previewLines(source, previewLines, true);
        bodyLinesCache.set(this, {
            source, selected, detailOpen, rawMode, showCriticalMarks, messageLayout, finalAssistantMessageId, expandedIds, previewLines, lines
        });
        return lines;
    }
    get spacerBefore(): boolean { return !!this.item?.spacerBefore; }
    get templateKind(): string { return this.item?.templateKind || ''; }
    get semanticKind(): string { return this.item?.semanticKind || ''; }
    get templateClass(): string { return 'message-template-system'; }
    get blockStyle(): Record<string, string> {
        if (!this.item?.blockPadding) return {};
        // The final answer already has a spacer row; adding full block padding
        // would double the gap before it.
        return { ...(this.item.itemStyle || {}), padding: this.item.spacerBefore ? '0' : '1em 0', margin: '0' };
    }

    toggleMessageDetail(line: AgentConsoleRenderedLine): void {
        const messageId = String(line?.messageId || '').trim();
        if (!messageId || !line?.toggleMode) return;
        this.state.setSelectedMessageId(messageId);
        if (line.toggleMode === 'detail') {
            if (this.state.messageDetailOpen) {
                this.state.closeMessageDetail();
            }
            return;
        }
        this.state.toggleMessageExpanded(messageId);
    }

    protected previewLines(
        lines: AgentConsoleRenderedLine[],
        previewLines: number,
        preserveTail: boolean
    ): AgentConsoleRenderedLine[] {
        if (this.state.rawMode || this.state.showCriticalMarks || lines.length <= previewLines) {
            return lines.map(line => ({ ...line, toggleMode: 'inline' as const }));
        }
        const questionTail = preserveTail ? this.trailingQuestionLineCount(lines) : 0;
        const tailLines = questionTail > 0 ? questionTail : preserveTail ? Math.min(2, Math.max(0, previewLines - 2)) : 0;
        const visibleBudget = questionTail > 0 ? this.state.consoleOptions.questionTailVisibleLines : previewLines;
        const headCount = preserveTail ? Math.max(visibleBudget - tailLines, 1) : previewLines;
        const head = lines.slice(0, Math.max(1, headCount));
        const tail = tailLines > 0 ? lines.slice(-tailLines) : [];
        return [...head, ...tail].map(line => ({ ...line, toggleMode: 'inline' as const }));
    }

    private trailingQuestionLineCount(lines: AgentConsoleRenderedLine[]): number {
        let count = 0;
        while (count < lines.length && /[？?]\s*$/.test(String(lines[lines.length - 1 - count]?.content || '').trimEnd())) {
            count++;
        }
        return count;
    }

}

@Component({ selector: 'agent-console-user-template', template: ITEM_TEMPLATE, imports: [AgentConsoleRoutedTokensComponent] })
export class AgentConsoleUserTemplate extends AgentConsoleMessageTemplateBase {
    override get templateClass(): string { return 'message-template-user'; }
}

/** Cross-platform Markdown document. Parsed tokens are shared by DOM and TUI renderers. */
@Component({ selector: 'agent-console-markdown', template: MARKDOWN_TEMPLATE, imports: [AgentConsoleRoutedTokensComponent] })
export class AgentConsoleMarkdownComponent extends AgentConsoleMessageTemplateBase {
    override get templateClass(): string { return 'message-template-assistant'; }
    override get lines(): AgentConsoleRenderedLine[] {
        return this.item?.lines || [];
    }
}

@Component({ selector: 'agent-console-thought-template', template: ITEM_TEMPLATE, imports: [AgentConsoleRoutedTokensComponent] })
export class AgentConsoleThoughtTemplate extends AgentConsoleMessageTemplateBase {
    override get templateClass(): string { return 'message-template-thought'; }
    override get lines(): AgentConsoleRenderedLine[] {
        const source = this.item?.lines || [];
        const selected = !!this.item?.selected;
        const detailOpen = this.state.messageDetailOpen;
        const rawMode = this.state.rawMode;
        const showCriticalMarks = this.state.showCriticalMarks;
        const reasoningPreviewLines = this.state.consoleOptions.reasoningPreviewLines;
        const expandedIds = this.state.expandedMessageIds;
        const messageId = String(source[0]?.messageId || '');
        const cached = thoughtLinesCache.get(this);
        if (cached
            && cached.source === source
            && cached.selected === selected
            && cached.detailOpen === detailOpen
            && cached.rawMode === rawMode
            && cached.showCriticalMarks === showCriticalMarks
            && cached.expandedIds === expandedIds
            && cached.reasoningPreviewLines === reasoningPreviewLines) {
            return cached.lines;
        }
        const lines = rawMode || (messageId && this.state.isMessageExpanded(messageId))
            ? source.map(line => ({ ...line, toggleMode: 'inline' as const }))
            : this.previewLines(source, reasoningPreviewLines, false);
        thoughtLinesCache.set(this, {
            source, selected, detailOpen, rawMode, showCriticalMarks, expandedIds, reasoningPreviewLines, lines
        });
        return lines;
    }
}

@Component({ selector: 'agent-console-tool-template', template: ITEM_TEMPLATE, imports: [AgentConsoleRoutedTokensComponent] })
export class AgentConsoleToolTemplate extends AgentConsoleMessageTemplateBase {
    override get templateClass(): string { return 'message-template-tool'; }
    override get lines(): AgentConsoleRenderedLine[] {
        return this.bodyPreviewLines(this.item?.lines || [], Math.max(1, this.state.consoleOptions.auxiliaryPreviewLines));
    }
}

@Component({ selector: 'agent-console-command-template', template: ITEM_TEMPLATE, imports: [AgentConsoleRoutedTokensComponent] })
export class AgentConsoleCommandTemplate extends AgentConsoleMessageTemplateBase {
    override get templateClass(): string { return 'message-template-command'; }
    override get lines(): AgentConsoleRenderedLine[] {
        return this.bodyPreviewLines(this.item?.lines || [], Math.max(1, this.state.consoleOptions.auxiliaryPreviewLines));
    }
}

@Component({ selector: 'agent-console-plan-template', template: ITEM_TEMPLATE, imports: [AgentConsoleRoutedTokensComponent] })
export class AgentConsolePlanTemplate extends AgentConsoleMessageTemplateBase {
    override get templateClass(): string { return 'message-template-plan'; }
}

@Component({ selector: 'agent-console-files-template', template: ITEM_TEMPLATE, imports: [AgentConsoleRoutedTokensComponent] })
export class AgentConsoleFilesTemplate extends AgentConsoleMessageTemplateBase {
    override get templateClass(): string { return 'message-template-files'; }
}

@Component({ selector: 'agent-console-question-template', template: ITEM_TEMPLATE, imports: [AgentConsoleRoutedTokensComponent] })
export class AgentConsoleQuestionTemplate extends AgentConsoleMessageTemplateBase {
    override get templateClass(): string { return 'message-template-question'; }
}

@Component({ selector: 'agent-console-approval-template', template: ITEM_TEMPLATE, imports: [AgentConsoleRoutedTokensComponent] })
export class AgentConsoleApprovalTemplate extends AgentConsoleMessageTemplateBase {
    override get templateClass(): string { return 'message-template-approval'; }
}

@Component({ selector: 'agent-console-error-template', template: ITEM_TEMPLATE, imports: [AgentConsoleRoutedTokensComponent] })
export class AgentConsoleErrorTemplate extends AgentConsoleMessageTemplateBase {
    override get templateClass(): string { return 'message-template-error'; }
}

@Component({ selector: 'agent-console-system-template', template: ITEM_TEMPLATE, imports: [AgentConsoleRoutedTokensComponent] })
export class AgentConsoleSystemTemplate extends AgentConsoleMessageTemplateBase {}
