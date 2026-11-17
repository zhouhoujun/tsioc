import { Component, Attribute, Computed } from '@tsdi/components';
import { Optional } from '@tsdi/ioc';
import { TranslatorService } from '@tsdi/i18n';
import type { AgentConsoleRenderedMessageItem, AgentConsoleRenderedLine } from './AgentConsoleMessageRenderers';
import { AgentConsoleSessionState } from './AgentConsoleSessionState';
import { getDisplayWidth, sliceByDisplayWidth } from './AgentConsoleTextWidth';
import { styleTextToObject } from './AgentConsoleTheme';

const ITEM_TEMPLATE = `
    <div class="message-block-spacing" v-if="spacerBefore">​</div>
    <div class="{{blockClass}}" data-message-id="{{item.messageId}}" data-template-kind="{{templateKind}}" data-semantic-kind="{{semanticKind}}" data-status="{{item.statusKind}}" data-selected="{{item.selected}}">
        <div class="message-line-wrap" v-for="line in lines">
            <label class="message-line" v-if="line.toggleMode" data-tone="{{line.tone}}" aria-label="{{line.ariaLabel}}" continuationIndent="{{line.continuationIndent}}" data-hover="fade" @click="toggleMessageDetail(line)">
                <span class="message-status">{{line.status}}</span>
                <span class="message-role" v-if="line.role">{{line.role}}</span>
                <span class="message-meta" v-if="line.meta">{{line.meta}}</span>
                <span class="message-prefix" v-if="line.prefix">{{line.prefix}}</span>
                <span class="message-body"><agent-console-routed-tokens :tokens="line.tokens"></agent-console-routed-tokens></span>
            </label>
            <label class="message-line" v-else data-tone="{{line.tone}}" aria-label="{{line.ariaLabel}}" continuationIndent="{{line.continuationIndent}}" data-hover="none">
                <span class="message-status">{{line.status}}</span>
                <span class="message-role" v-if="line.role">{{line.role}}</span>
                <span class="message-meta" v-if="line.meta">{{line.meta}}</span>
                <span class="message-prefix" v-if="line.prefix">{{line.prefix}}</span>
                <span class="message-body"><agent-console-routed-tokens :tokens="line.tokens"></agent-console-routed-tokens></span>
            </label>
        </div>
    </div>
`;

const MARKDOWN_TEMPLATE = `
    <div class="message-block-spacing" v-if="spacerBefore">​</div>
    <div class="{{markdownClass}}" data-message-id="{{item.messageId}}" data-template-kind="{{templateKind}}" data-semantic-kind="{{semanticKind}}" data-status="{{item.statusKind}}" data-selected="{{item.selected}}">
        <label class="message-line markdown-line" v-for="line in lines" data-tone="{{line.tone}}" aria-label="{{line.ariaLabel}}" continuationIndent="{{line.continuationIndent}}" data-code="{{line.code}}" data-table="{{line.table}}">
            <span class="message-status">{{line.status}}</span>
            <span class="message-role" v-if="line.role">{{line.role}}</span>
            <span class="message-meta" v-if="line.meta">{{line.meta}}</span>
            <span class="message-prefix" v-if="line.prefix">{{line.prefix}}</span>
            <span class="message-body"><agent-console-routed-tokens :tokens="line.tokens"></agent-console-routed-tokens></span>
        </label>
    </div>
`;

@Component({
    selector: 'agent-console-routed-tokens',
    template: `
        <span class="message-content">
            <span class="{{token.className}}" v-for="token in renderedTokens">{{token.text}}</span>
        </span>
    `
})
export class AgentConsoleRoutedTokensComponent {
    @Attribute() tokens: AgentConsoleRenderedLine['tokens'] = [];

    /**
     * Visible token views. The template renders `class="{{token.className}}"`
     * (a simple path): a partially interpolated class such as
     * `tone-{{token.tone}}` keeps a dangling `tone-` prefix when the token has
     * no tone, so the whole class list is resolved here instead. The framework
     * caches the derived list and invalidates it when `tokens` changes.
     */
    @Computed()
    get renderedTokens(): Array<{ text: string; className: string }> {
        const tokens = Array.isArray(this.tokens)
            ? this.tokens as unknown as Array<{ text?: string; tone?: string }>
            : [];
        return tokens.map(token => ({
            text: String(token?.text ?? ''),
            className: token?.tone ? `message-token tone-${token.tone}` : 'message-token'
        }));
    }
}

@Component({
    selector: 'agent-console-routed-line',
    imports: [AgentConsoleRoutedTokensComponent],
    template: `
        <label class="message-line" data-tone="{{line.tone}}" aria-label="{{ariaLabel}}" data-hover="{{line.toggleMode ? 'fade' : 'none'}}" @click="toggleMessageDetail()">
            <span class="message-status">{{status}}</span>
            <span class="message-role" v-if="role">{{role}}</span>
            <span class="message-meta" v-if="meta">{{meta}}</span>
            <span class="message-prefix" v-if="prefix">{{prefix}}</span>
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
        const messageId = String(source[0]?.messageId || '');
        const expanded = this.state.rawMode
            || this.state.showCriticalMarks
            || this.state.messageLayout === 'scrollback'
            || (messageId && messageId === this.state.finalAssistantMessageId)
            || (messageId && this.state.isMessageExpanded(messageId))
            || (this.state.messageDetailOpen && !!this.item?.selected);
        return expanded
            ? source.map(line => ({ ...line, toggleMode: 'inline' as const }))
            : this.previewLines(source, previewLines, true);
    }
    /**
     * Auxiliary rows (tool/command) collapse to a preview unless the row is the
     * final answer, expanded, or the layout asks for the full body.
     */
    @Computed()
    protected get previewedLines(): AgentConsoleRenderedLine[] {
        return this.bodyPreviewLines(this.item?.lines || [], Math.max(1, this.state.consoleOptions.auxiliaryPreviewLines));
    }
    get spacerBefore(): boolean { return !!this.item?.spacerBefore; }
    get templateKind(): string { return this.item?.templateKind || ''; }
    get semanticKind(): string { return this.item?.semanticKind || ''; }
    get templateClass(): string { return 'message-template-system'; }
    get blockClass(): string { return `message-item-block ${this.templateClass}${this.item?.blockPadding ? ' is-block-padded' : ''}`; }
    get markdownClass(): string { return `message-markdown ${this.templateClass}${this.item?.blockPadding ? ' is-block-padded' : ''}`; }
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
    @Computed()
    override get lines(): AgentConsoleRenderedLine[] {
        const source = this.item?.lines || [];
        const messageId = String(source[0]?.messageId || '');
        const expanded = this.state.rawMode || (!!messageId && this.state.isMessageExpanded(messageId));
        const markdownContentWidth = Number(this.state.markdownContentWidth) || 0;
        return expanded
            ? this.expandedThoughtLines(source)
            : this.collapsedThoughtLines(source, markdownContentWidth);
    }

    /** Expanded thoughts keep every line; the first line swaps + for −. */
    protected expandedThoughtLines(source: AgentConsoleRenderedLine[]): AgentConsoleRenderedLine[] {
        const collapseHint = this.translator?.translate?.('agent.message.collapse');
        return source.map((line, index) => ({
            ...line,
            status: index === 0 ? this.disclosureStatus(line.status, '−') : line.status,
            ariaLabel: index === 0
                ? [line.ariaLabel, typeof collapseHint === 'string' ? collapseHint : ''].filter(Boolean).join(' · ')
                : line.ariaLabel,
            toggleMode: 'inline' as const
        }));
    }

    /**
     * Collapsed thoughts are a single scannable row: `+ Thought · <preview> (1.2s)`.
     * The preview is clipped to the terminal budget so live reasoning can never
     * grow the transcript, and the whole row stays clickable to expand.
     */
    protected collapsedThoughtLines(source: AgentConsoleRenderedLine[], contentWidth: number): AgentConsoleRenderedLine[] {
        const base = source.find(line => this.visibleThoughtText(line)) || source[0];
        if (!base) {
            return [];
        }
        const budget = Math.max(24, (contentWidth > 0 ? contentWidth - 18 : 72));
        const duration = this.thoughtDurationToken(source[source.length - 1]) || this.thoughtDurationToken(base);
        const contentTokens = (base.tokens || []).filter(token => !this.isThoughtDurationToken(token));
        const preview = contentTokens.length
            ? this.truncateThoughtTokens(contentTokens, budget)
            : this.plainThoughtPreview(this.visibleThoughtText(base), budget);
        const tokens = duration ? [...preview, { ...duration, text: String(duration.text || '') }] : preview;
        const expandHint = this.translator?.translate?.('agent.message.expandAction');
        return [{
            ...base,
            status: this.disclosureStatus(base.status, '+'),
            tokens,
            toggleMode: 'inline' as const,
            ariaLabel: [base.ariaLabel, typeof expandHint === 'string' ? expandHint : ''].filter(Boolean).join(' · ')
        }];
    }

    /** Visible text, ignoring zero-width/whitespace-only lines and duration tokens. */
    protected visibleThoughtText(line?: AgentConsoleRenderedLine): string {
        const content = String(line?.content || '').replace(/[\u200b-\u200f\u2060\ufeff]/g, '').trim();
        if (content) {
            return content;
        }
        return (line?.tokens || [])
            .filter(token => !this.isThoughtDurationToken(token))
            .map(token => String(token?.text || ''))
            .join('')
            .replace(/[\u200b-\u200f\u2060\ufeff]/g, '')
            .trim();
    }

    protected thoughtDurationToken(line?: AgentConsoleRenderedLine) {
        return (line?.tokens || []).find(token => this.isThoughtDurationToken(token));
    }

    protected isThoughtDurationToken(token?: AgentConsoleRenderedLine['tokens'][number]): boolean {
        return token?.tone === 'muted' && /^\s*\([^()]+\)\s*$/.test(String(token?.text || ''));
    }

    protected plainThoughtPreview(text: string, budget: number): NonNullable<AgentConsoleRenderedLine['tokens']> {
        if (!text) {
            return [];
        }
        const clipped = getDisplayWidth(text) > budget ? `${sliceByDisplayWidth(text, Math.max(1, budget - 1))}…` : text;
        return [{ text: clipped, style: {} }];
    }

    protected disclosureStatus(status: string | undefined, glyph: string): string {
        const text = String(status || '');
        return text ? `${glyph}${text.slice(1)}` : `${glyph} `;
    }

    protected truncateThoughtTokens(tokens: NonNullable<AgentConsoleRenderedLine['tokens']>, budget: number): NonNullable<AgentConsoleRenderedLine['tokens']> {
        const result: NonNullable<AgentConsoleRenderedLine['tokens']> = [];
        let used = 0;
        for (const token of tokens) {
            const text = String(token?.text || '');
            if (!text) {
                continue;
            }
            const width = getDisplayWidth(text);
            if (used + width <= budget) {
                result.push(token);
                used += width;
                continue;
            }
            const remaining = Math.max(0, budget - used);
            const slice = remaining > 1 ? sliceByDisplayWidth(text, remaining - 1) : '';
            if (slice) {
                result.push({ ...token, text: slice });
            }
            result.push({ text: '…', tone: 'muted', style: token?.style || {} });
            return result;
        }
        return result;
    }
}

@Component({ selector: 'agent-console-tool-template', template: ITEM_TEMPLATE, imports: [AgentConsoleRoutedTokensComponent] })
export class AgentConsoleToolTemplate extends AgentConsoleMessageTemplateBase {
    override get templateClass(): string { return 'message-template-tool'; }
    override get lines(): AgentConsoleRenderedLine[] {
        return this.previewedLines;
    }
}

/**
 * Collapsed run of finished execution steps. The projection already emits the
 * summary line (collapsed) or summary + one line per step (expanded), so this
 * template must not preview/collapse the lines again.
 */
@Component({ selector: 'agent-console-activity-template', template: ITEM_TEMPLATE, imports: [AgentConsoleRoutedTokensComponent] })
export class AgentConsoleActivityTemplate extends AgentConsoleMessageTemplateBase {
    override get templateClass(): string { return 'message-template-tool'; }
    override get lines(): AgentConsoleRenderedLine[] {
        const lines = this.item?.lines || [];
        // The projection emits one line when folded and summary + one line per
        // step when expanded; use the Thought-style +/− disclosure marker so
        // the row reads as expandable instead of an ordinary finished tool.
        const expanded = lines.length > 1;
        const muted = styleTextToObject(this.state?.theme?.statusLabel);
        return lines.map((line, index) => ({
            ...line,
            status: index === 0 ? (expanded ? '−' : '+') : line.status,
            statusStyle: index === 0 ? muted : line.statusStyle,
            toggleMode: 'inline' as const
        }));
    }
}

@Component({ selector: 'agent-console-command-template', template: ITEM_TEMPLATE, imports: [AgentConsoleRoutedTokensComponent] })
export class AgentConsoleCommandTemplate extends AgentConsoleMessageTemplateBase {
    override get templateClass(): string { return 'message-template-command'; }
    override get lines(): AgentConsoleRenderedLine[] {
        return this.previewedLines;
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
