import { Component, Attribute } from '@tsdi/components';
import { Optional } from '@tsdi/ioc';
import { TranslatorService } from '@tsdi/i18n';
import type { AgentConsoleRenderedMessageItem, AgentConsoleRenderedLine } from './AgentConsoleMessageRenderers';
import { AgentConsoleSessionState } from './AgentConsoleSessionState';
import { styleTextToObject } from './AgentConsoleTheme';

const ITEM_TEMPLATE = `
    <div class="message-block-spacing" v-if="spacerBefore">​</div>
    <div class="message-item-block {{templateClass}}" v-style="blockStyle">
        <label class="message-line" v-for="line in lines" v-style="line.itemStyle" aria-label="{{line.ariaLabel}}">
            <span v-style="line.statusStyle">{{line.status}}</span>
            <span v-style="line.roleStyle" v-show="line.role">{{line.role}}</span>
            <span v-style="line.metaStyle" v-show="line.meta">{{line.meta}}</span>
            <span v-style="line.prefixStyle" v-show="line.prefix">{{line.prefix}}</span>
            <span class="message-detail-toggle" v-style="line.lineStyle" v-if="line.toggleContent" @click="toggleMessageDetail(line)">{{line.toggleContent}}</span>
            <span v-style="line.lineStyle" v-else><agent-console-routed-tokens :tokens="line.tokens"></agent-console-routed-tokens></span>
        </label>
    </div>
`;

const MARKDOWN_TEMPLATE = `
    <div class="message-block-spacing" v-if="spacerBefore">​</div>
    <div class="message-markdown {{templateClass}}" v-style="blockStyle">
        <label class="message-line markdown-line" v-for="line in lines" v-style="line.itemStyle" aria-label="{{line.ariaLabel}}">
            <span v-style="line.statusStyle">{{line.status}}</span>
            <span v-style="line.roleStyle" v-show="line.role">{{line.role}}</span>
            <span v-style="line.metaStyle" v-show="line.meta">{{line.meta}}</span>
            <span v-style="line.prefixStyle" v-show="line.prefix">{{line.prefix}}</span>
            <span class="message-detail-toggle" v-style="line.lineStyle" v-if="line.toggleContent" @click="toggleMessageDetail(line)">{{line.toggleContent}}</span>
            <span v-style="line.lineStyle" v-else><agent-console-routed-tokens :tokens="line.tokens"></agent-console-routed-tokens></span>
        </label>
    </div>
`;

const thoughtLinesCache = new WeakMap<object, {
    source: AgentConsoleRenderedLine[];
    selected: boolean;
    detailOpen: boolean;
    rawMode: boolean;
    showCriticalMarks: boolean;
    reasoningPreviewLines: number;
    lines: AgentConsoleRenderedLine[];
}>();

@Component({
    selector: 'agent-console-routed-tokens',
    template: `
        <span class="message-content">
            <span class="message-token" v-style="token.style" v-for="token in tokens">{{token.text}}</span>
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
        <label class="message-line" v-style="lineStyle" aria-label="{{ariaLabel}}">
            <span v-style="statusStyle">{{status}}</span>
            <span v-style="roleStyle" v-show="role">{{role}}</span>
            <span v-style="metaStyle" v-show="meta">{{meta}}</span>
            <span v-style="prefixStyle" v-show="prefix">{{prefix}}</span>
            <span class="message-detail-toggle" v-style="contentStyle" v-if="toggleContent" @click="toggleMessageDetail()">{{toggleContent}}</span>
            <span v-style="contentStyle" v-if="!toggleContent">
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
    get toggleContent() { return this.line?.toggleContent || ''; }
    get tokens() { return this.toggleContent ? [] : this.line?.tokens || []; }

    toggleMessageDetail(): void {
        const messageId = String(this.line?.messageId || '').trim();
        if (!messageId) return;
        if (this.state.messageDetailOpen && this.state.selectedMessageId === messageId) {
            this.state.closeMessageDetail();
            return;
        }
        this.state.setSelectedMessageId(messageId);
        this.state.openMessageDetail(false);
    }
}

export abstract class AgentConsoleMessageTemplateBase {
    @Attribute() item?: AgentConsoleRenderedMessageItem;
    @Attribute() state!: AgentConsoleSessionState;

    constructor(@Optional() protected translator?: TranslatorService) {}

    get lines(): AgentConsoleRenderedLine[] {
        return this.item?.lines || [];
    }
    get spacerBefore(): boolean { return !!this.item?.spacerBefore; }
    get templateClass(): string { return 'message-template-system'; }
    get blockStyle(): Record<string, string> {
        if (!this.item?.blockPadding) return {};
        return { ...(this.item.itemStyle || {}), padding: '1em 0', margin: '0' };
    }

    toggleMessageDetail(line: AgentConsoleRenderedLine): void {
        const messageId = String(line?.messageId || '').trim();
        if (!messageId) return;
        if (this.state.messageDetailOpen && this.state.selectedMessageId === messageId) {
            this.state.closeMessageDetail();
            return;
        }
        this.state.setSelectedMessageId(messageId);
        this.state.openMessageDetail(false);
    }

    protected previewLines(
        lines: AgentConsoleRenderedLine[],
        previewLines: number,
        preserveTail: boolean
    ): AgentConsoleRenderedLine[] {
        if (this.state.rawMode || this.state.showCriticalMarks || lines.length <= previewLines) {
            return lines;
        }
        const questionTail = preserveTail ? this.trailingQuestionLineCount(lines) : 0;
        const tailLines = questionTail > 0 ? questionTail : preserveTail ? Math.min(2, previewLines - 2) : 0;
        const visibleBudget = questionTail > 0 ? this.state.consoleOptions.questionTailVisibleLines : previewLines;
        const headCount = preserveTail ? Math.max(visibleBudget - tailLines - 1, 1) : previewLines;
        const head = lines.slice(0, headCount);
        const tail = tailLines > 0 ? lines.slice(-tailLines) : [];
        const hiddenCount = lines.length - headCount - tailLines;
        const baseLine = head[head.length - 1];
        const toggleText = this.expandLabel(hiddenCount);
        const toggleStyle = {
            ...(baseLine.lineStyle || {}),
            ...styleTextToObject(this.state.theme.statusLabel),
            cursor: 'pointer'
        };
        return [...head, {
            ...baseLine,
            previewCollapsed: true,
            prefix: '',
            prefixStyle: {},
            content: toggleText,
            toggleContent: toggleText,
            tokens: [{ text: toggleText, tone: 'muted', style: toggleStyle }],
            itemStyle: { ...(baseLine.itemStyle || {}), padding: '1em 1ch' },
            lineStyle: toggleStyle
        }, ...tail];
    }

    private trailingQuestionLineCount(lines: AgentConsoleRenderedLine[]): number {
        let count = 0;
        while (count < lines.length && /[？?]\s*$/.test(String(lines[lines.length - 1 - count]?.content || '').trimEnd())) {
            count++;
        }
        return count;
    }

    private expandLabel(hiddenCount: number): string {
        if (this.state.consoleOptions.messageToggleInteraction === 'enter') {
            return this.translator?.translate('agent.message.expandEnter', { count: hiddenCount })
                || `… ${hiddenCount} more lines. Press Enter to expand`;
        }
        return this.translator?.translate('agent.message.expand', { count: hiddenCount })
            || `… ${hiddenCount} more lines. Click to expand`;
    }

}

@Component({ selector: 'agent-console-user-template', template: ITEM_TEMPLATE, imports: [AgentConsoleRoutedTokensComponent] })
export class AgentConsoleUserTemplate extends AgentConsoleMessageTemplateBase {}

/** Cross-platform Markdown document. Parsed tokens are shared by DOM and TUI renderers. */
@Component({ selector: 'agent-console-markdown', template: MARKDOWN_TEMPLATE, imports: [AgentConsoleRoutedTokensComponent] })
export class AgentConsoleMarkdownComponent extends AgentConsoleMessageTemplateBase {}

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
        const cached = thoughtLinesCache.get(this);
        if (cached
            && cached.source === source
            && cached.selected === selected
            && cached.detailOpen === detailOpen
            && cached.rawMode === rawMode
            && cached.showCriticalMarks === showCriticalMarks
            && cached.reasoningPreviewLines === reasoningPreviewLines) {
            return cached.lines;
        }
        const lines = detailOpen && selected
            ? source
            : this.previewLines(source, reasoningPreviewLines, false);
        thoughtLinesCache.set(this, {
            source, selected, detailOpen, rawMode, showCriticalMarks, reasoningPreviewLines, lines
        });
        return lines;
    }
}

@Component({ selector: 'agent-console-tool-template', template: ITEM_TEMPLATE, imports: [AgentConsoleRoutedTokensComponent] })
export class AgentConsoleToolTemplate extends AgentConsoleMessageTemplateBase {
    override get templateClass(): string { return 'message-template-tool'; }
}

@Component({ selector: 'agent-console-command-template', template: ITEM_TEMPLATE, imports: [AgentConsoleRoutedTokensComponent] })
export class AgentConsoleCommandTemplate extends AgentConsoleMessageTemplateBase {
    override get templateClass(): string { return 'message-template-command'; }
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
