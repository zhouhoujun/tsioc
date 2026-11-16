import { Attribute, Component, ReactiveEffect, reactive } from '@tsdi/components';
import { DialogComponent } from '@tsdi/components/common/dialog';
import { formatCompactNumber } from '@tsdi/core';
import { Optional } from '@tsdi/ioc';
import { TranslatorService } from '@tsdi/i18n';
import { formatAgentUiLabel, formatAgentKeymapActionLabel, formatAgentPanelLabel as panelLabel, formatAgentPanelStatusLabel as panelStatusLabel } from './agent-ui.i18n';
import { formatAgentConsoleInputBadges } from './AgentConsoleInputBadges';
import { formatScheduledTaskDetailLines } from './AgentConsoleScheduledTaskFormat';
import { formatSessionAge, formatSessionHint } from './AgentConsoleFormatters';
import { formatReviewHeaderMeta, formatReviewSelectionMeta, formatReviewStatsMeta } from './AgentConsoleReviewPanelFormat';
import { resolveMessageRowOffset } from './AgentConsoleTranscriptLayout';
import { AgentMessage, basenameAgentPath, ScheduledAgentTask } from '@tsdi/agent';
import {
    AgentConsoleActivity,
    AgentConsoleHealthItem,
    AgentConsoleHealthStatus,
    AgentConsolePlanTodoItem,
    AgentConsoleReviewWorker,
    AgentConsoleReviewTaskItem,
    AgentConsoleSessionItem,
    AgentConsoleSelectMenu,
    AgentConsoleSessionState,
    AgentConsoleTokenUsage,
    AgentConsoleToolItem,
    AgentConsoleToolRun,
    AgentConsoleCommandOutputEntry
} from './AgentConsoleSessionState';
import { isAgentConsoleSuggestionMenu } from './AgentConsoleSuggestions';
import { formatToolPanelInactiveSuffix, formatToolPanelLastRun, formatToolPanelStatus, formatToolPanelTitle } from './AgentConsoleToolPanelText';
import {
    AgentConsoleMarkdownLine,
    AgentConsoleMarkdownToken,
    AgentConsoleMarkdownTone,
    renderAgentConsoleMarkdownLines
} from './AgentConsoleMarkdown';
import {
    AgentConsoleRenderedLine,
    AgentConsoleRenderedMessageItem,
    renderAgentConsoleMessageItems,
    renderAgentConsoleMessageItem,
    deriveTimelineDurations,
    AgentConsoleMessageRendererRegistry,
    resolveAgentConsoleMarkdownToneStyle
} from './AgentConsoleMessageRenderers';
import { presentAgentConsoleSessionContent } from './AgentConsoleSessionContentPresenter';
import { AgentConsoleMessageOutletDirective } from './AgentConsoleMessageOutlet';
import {
    AgentConsoleTheme,
    AgentConsoleThemeStyles,
    defaultAgentConsoleTheme,
    styleTextToObject
} from './AgentConsoleTheme';
import { DIALOG_CLOSE_STYLE, menuShellStyle, resolvePanelThemeStyles, resolveSectionFrameStyle } from './AgentConsolePanelStyles';
import { AgentConsoleStatuslineField } from './AgentConsoleStatusline';
import { DEFAULT_TIMELINE_LABELS, resolveTimelineWindowLedger, TimelineWindowMode } from './AgentConsoleTimelineWindow';
import {
    buildBrandBlock as buildTerminalBrandBlock,
    resolveEnterAction as resolveConsoleEnterAction,
    resolveListWindow as resolveConsoleListWindow,
    resolveSelectWindow as resolveConsoleSelectWindow,
} from '@tsdi/components/common';
import {
    PanelComponent,
} from '@tsdi/components/common/panel';
import {
    ListComponent,
} from '@tsdi/components/common/list';
import {
    SelectComponent,
} from '@tsdi/components/common/select';
import { messageItemsCache, rememberSessionMessageItems, sessionMessageItemsEntry } from './AgentConsoleMessageCache';
import { sameAgentConsoleMessages } from './AgentConsoleMessageEquality';
import { InputFieldComponent } from './AgentConsoleInputField';
import { MessageRowComponent } from './AgentConsoleMessageRow';

/** Stable, proxy-independent render key for one message plus its predecessor. */
function messageRenderSignature(message: any): string {
    if (!message) return '';
    try {
        return [
            message.id || '',
            message.role || '',
            Number(message.createdAt) || 0,
            String(message.content || ''),
            JSON.stringify(message.metadata || null),
            JSON.stringify(message.parts || null)
        ].join('\u0000');
    } catch {
        return '';
    }
}
@Component({
    selector: 'agent-console-messages-panel',
    imports: [
        AgentConsoleMessageOutletDirective
    ],
    template: `
    <div class="console-panel console-messages-panel" renderRegion="messages" focusable [focused]="transcriptFocused">
        <label class="message-empty" v-if="emptyLabel">{{emptyLabel}}</label>
        <div class="message-row" v-for="item in renderedMessageItems">
            <div [agentConsoleMessageOutlet]="item"></div>
        </div>
    </div>
    `
})
export class AgentConsoleMessagesPanelComponent {
    constructor(
        private state: AgentConsoleSessionState,
        @Optional() private translator?: TranslatorService,
        @Optional() private messageRendererRegistry?: AgentConsoleMessageRendererRegistry
    ) {
    }

    @Attribute() theme: AgentConsoleTheme = defaultAgentConsoleTheme;

    protected get activeTheme(): AgentConsoleTheme {
        return this.state?.theme || this.theme || defaultAgentConsoleTheme;
    }

    get messages(): Array<{ id?: string; role?: string; content: string; metadata?: Record<string, any> }> {
        // The console detail view replaces the transcript. Avoid rendering its
        // full selected message in this hidden panel while detail is open.
        if (this.state.consoleOptions.messageToggleInteraction === 'enter'
            && this.state.messageDetailOpen) {
            return [];
        }
        return this.state.displayMessages;
    }

    get shellStyle() {
        return (this.messages.length || this.emptyLabel)
            ? resolveSectionFrameStyle(this.activeTheme.messagesShell)
            : {};
    }

    get titleStyle() {
        return styleTextToObject(this.activeTheme.messagesTitle);
    }

    get emptyStyle() {
        return styleTextToObject(this.activeTheme.statusLabel);
    }

    get transcriptFocused(): boolean {
        return this.state.messagesFocused && !this.state.messageDetailOpen;
    }

    get emptyLabel(): string {
        return '';
    }

    get visibleMessages(): Array<{ id?: string; role?: string; content: string; metadata?: Record<string, any> }> {
        const messages = this.messages;
        if (this.state.timelineMode) {
            return this.resolveTimelineVisibleMessages(messages);
        }
        // Viewport mode renders only the tail while following the latest row;
        // the surface keeps scroll distance-from-bottom, so expanding to the
        // full transcript (scroll up / selection / reveal) does not jump.
        const limit = this.transcriptWindowLimit;
        if (limit > 0 && messages.length > limit && this.shouldWindowTranscript(limit)) {
            return messages.slice(-limit);
        }
        // MESSAGE LAYOUT CONTRACT: native scrollback and non-following viewport
        // render the full transcript and let the platform clip/scroll it.
        return messages;
    }

    /** Tail-window size for viewport mode (0 disables windowing). */
    protected get transcriptWindowLimit(): number {
        return Math.max(0, Number(this.state.consoleOptions.transcriptWindowMessages) || 0);
    }

    protected shouldWindowTranscript(limit: number): boolean {
        const state = this.state;
        if (state.messageLayout === 'scrollback') {
            return false;
        }
        if (!state.transcriptFollowing || state.messagesFocused || state.messageDetailOpen) {
            return false;
        }
        const messages = this.messages;
        const hidden = messages.length - limit;
        // An older error root cause must never be windowed away.
        for (let index = 0; index < hidden; index += 1) {
            const metadata: any = messages[index]?.metadata || {};
            const status = String(metadata.status || '').toLowerCase();
            if (metadata.error || status === 'failed' || status === 'error' || status === 'cancelled') {
                return false;
            }
        }
        return true;
    }

    /** Slice identity so the item cache invalidates when the window changes. */
    protected get transcriptWindowSignature(): string {
        const visible = this.visibleMessages;
        if (!visible.length) {
            return 'empty';
        }
        const first = String(visible[0]?.id || '');
        const last = String(visible[visible.length - 1]?.id || '');
        return `${visible.length}:${first}:${last}`;
    }

    protected resolveTimelineVisibleMessages(
        messages: Array<{ id?: string; role?: string; content: string; metadata?: Record<string, any> }>
    ): Array<{ id?: string; role?: string; content: string; metadata?: Record<string, any> }> {
        const result = resolveTimelineWindowLedger({
            messages,
            limit: Math.max(1, this.state.consoleOptions.messagesVisibleItems),
            mode: this.state.timelineViewMode as TimelineWindowMode,
            activeScope: String(this.state.activeTurnEventScope || '').trim(),
            summaryLabels: this.state.consoleOptions.timelineLabels,
            header: this.state.sessionHeader,
            footer: this.state.sessionFooter,
            collapsedTurns: this.state.timelineCollapsedTurns
        });
        return result.items.map(item => item.message);
    }

    get messageItems(): AgentConsoleRenderedMessageItem[] {
        const messages = this.messages;
        const theme = this.activeTheme;
        const selectedMessageId = this.state.selectedMessageId;
        const messagesFocused = this.state.messagesFocused;
        const consoleOptions = this.state.consoleOptions;
        const rawMode = this.state.rawMode;
        const streaming = this.state.status === 'running' || this.state.status === 'reasoning';
        const showTimestamps = this.state.consoleOptions.showMessageTimestamps && this.state.showTimestamps;
        const showCriticalMarks = this.state.showCriticalMarks;
        const showToolOutput = this.state.showToolOutput;
        const showUsername = this.state.showUsername;
        const timelineMode = this.state.timelineMode;
        const timelineViewMode = this.state.timelineViewMode;
        const messageDetailOpen = this.state.messageDetailOpen;
        const collapsedTurns = this.state.timelineCollapsedTurns;
        const sessionId = String(this.state.sessionId || '').trim();
        const windowSignature = this.transcriptWindowSignature;
        // Hide/show tab switch: reuse this session's projection even though the
        // panel last painted a different tab.
        const cached = sessionMessageItemsEntry(this, sessionId, messageItemsCache.get(this));

        const context = {
            rendererRegistry: this.messageRendererRegistry,
            theme: this.activeTheme,
            selectedMessageId: this.state.selectedMessageId,
            messagesFocused: this.state.messagesFocused,
            statusLabels: this.state.consoleOptions.messageStatusLabels,
            statusSymbol: this.state.consoleOptions.messageStatusSymbol,
            rawMode,
            streaming,
            showTimestamps,
            showCriticalMarks,
            showToolOutput,
            showUsername,
            username: this.state.consoleOptions.username,
            timelineMode,
            timelineViewMode,
            timelineLabels: this.state.consoleOptions.timelineLabels, translator: this.translator,
            messageDetailOpen, messageDetailVisibleLines: this.state.messageDetailVisibleLines, markdownContentWidth: this.state.markdownContentWidth
        };
        const sameContext = !!cached
            && cached.theme === theme
            && cached.statusLabels === consoleOptions.messageStatusLabels
            && cached.statusSymbol === consoleOptions.messageStatusSymbol
            && cached.username === consoleOptions.username
            && cached.rawMode === rawMode
            && cached.streaming === streaming
            && cached.showTimestamps === showTimestamps
            && cached.showCriticalMarks === showCriticalMarks
            && cached.showToolOutput === showToolOutput
            && cached.showUsername === showUsername
            && cached.timelineMode === timelineMode
            && cached.timelineViewMode === timelineViewMode
            && cached.messageDetailOpen === messageDetailOpen && cached.markdownContentWidth === this.state.markdownContentWidth
            && cached.collapsedTurns === collapsedTurns
            && cached.windowSignature === windowSignature;
        // The reactive proxy can hand back a different array identity for the
        // same restored transcript; compare content for the per-session cache.
        const sameMessages = !!cached && sameAgentConsoleMessages(cached.messages as any, messages as any);
        const sameSelection = !!cached
            && cached.selectedMessageId === selectedMessageId
            && cached.messagesFocused === messagesFocused;
        if (cached && sameContext && sameSelection && sameMessages) {
            return cached.items;
        }
        if (cached && sameContext && sameMessages) {
            // Selection/focus changed but the transcript did not: re-render only
            // the previous and next selected rows, keeping every other parsed
            // item. Rebuilding all 50 messages here was the tab-switch stall.
            const source = deriveTimelineDurations(this.visibleMessages as any);
            const previousSelected = String(cached.selectedMessageId || '');
            const nextSelected = String(selectedMessageId || '');
            const items = cached.items.map((item, index) => {
                const messageId = String(item.lines.find(line => line.messageId)?.messageId || source[index]?.id || '');
                return messageId === previousSelected || messageId === nextSelected
                    ? renderAgentConsoleMessageItem(source[index] as any, context)
                    : item;
            });
            const entry = {
                sessionId,
                messages,
                slotKeys: cached.slotKeys,
                selectedMessageId,
                messagesFocused,
                theme,
                statusLabels: consoleOptions.messageStatusLabels,
                statusSymbol: consoleOptions.messageStatusSymbol,
                username: consoleOptions.username,
                rawMode,
                streaming,
                showTimestamps,
                showCriticalMarks,
                showToolOutput,
                showUsername,
                timelineMode,
                timelineViewMode,
                messageDetailOpen,
                markdownContentWidth: this.state.markdownContentWidth,
                collapsedTurns,
                windowSignature,
                items
            };
            messageItemsCache.set(this, entry);
            rememberSessionMessageItems(this, entry);
            return items;
        }
        // Streaming replaces only the moving message. Reuse already rendered
        // items whose content and predecessor are unchanged instead of
        // re-parsing the whole transcript for every token.
        const source = deriveTimelineDurations(this.visibleMessages as any);
        const signatures = source.map(message => messageRenderSignature(message));
        const slotKeys = signatures.map((signature, index) =>
            `${index > 0 ? signatures[index - 1] : ''}\u0000${signature}`);
        const items = cached && sameContext && cached.slotKeys
            ? source.map((message, index) => {
                const cachedItem = cached.items[index];
                if (cached.slotKeys[index] === slotKeys[index] && cachedItem) {
                    return cachedItem;
                }
                const item = renderAgentConsoleMessageItem(message as any, context);
                const previous = index > 0 ? source[index - 1] : undefined;
                const previousPresentation = previous ? presentAgentConsoleSessionContent(previous as any) : undefined;
                if (previousPresentation?.kind === 'user' && item.semanticKind !== 'user') {
                    item.spacerBefore = true;
                    item.blockPadding = true;
                }
                return item;
            })
            : renderAgentConsoleMessageItems(this.visibleMessages as any, context);
        const entry = {
            sessionId,
            messages,
            slotKeys,
            selectedMessageId,
            messagesFocused,
            theme,
            statusLabels: consoleOptions.messageStatusLabels,
            statusSymbol: consoleOptions.messageStatusSymbol,
            username: consoleOptions.username,
            rawMode,
            streaming,
            showTimestamps,
            showCriticalMarks,
            showToolOutput,
            showUsername,
            timelineMode,
            timelineViewMode,
            messageDetailOpen, markdownContentWidth: this.state.markdownContentWidth,
            collapsedTurns,
            windowSignature,
            items
        };
        messageItemsCache.set(this, entry);
        rememberSessionMessageItems(this, entry);
        return items;
    }

    get messagesHintLabel(): string {
        if (!this.messages.length || !(this.state.messagesFocused || !this.state.transcriptFollowing)) {
            return '';
        }
        const hint = this.state.consoleOptions.messagesHint;
        const newCount = this.state.messagesNewCount;
        if (newCount <= 0) {
            return hint;
        }
        const indicator = this.translator?.translate('agent.message.newBelow', { count: newCount })
            || `↓ ${newCount} new`;
        return hint ? `${hint} · ${indicator}` : indicator;
    }

    get messageLabels(): string[] {
        return this.renderedLines.map(line =>
            `${line.status || ''}${line.role || ''}${line.prefix || ''}${line.content}`
        );
    }

    get renderedLines(): AgentConsoleRenderedLine[] {
        return this.renderedMessageItems.flatMap(item => {
            const itemKey = item.lines.find(line => line.messageId)?.messageId
                || `${item.templateKind || 'message'}:${item.renderRegion || 'row'}`;
            const lines = item.lines.map((line, lineIndex) => ({
                ...line,
                renderKey: line.messageId
                    ? `${line.messageId}:${lineIndex}`
                    : `${itemKey}:${lineIndex}`
            }));
            if (item.spacerBefore) {
                lines.unshift({
                    renderKey: `${itemKey}:spacer`,
                    content: '\u200b',
                    tokens: [{ text: '\u200b', style: {} }],
                    itemStyle: { display: 'block', padding: '0', margin: '0' },
                    lineStyle: {},
                    ariaLabel: ''
                });
            }
            return lines;
        });
    }

    get messagesSummary(): string {
        return this.messageLabels.join(' | ');
    }

    onMessageLineClick(line?: AgentConsoleRenderedLine): void {
        const messageId = String(line?.messageId || '').trim();
        if (!messageId || !line?.toggleMode) {
            return;
        }
        this.state.setSelectedMessageId(messageId);
        if (line.toggleMode === 'detail') {
            if (this.state.messageDetailOpen) {
                this.state.closeMessageDetail();
            }
            return;
        }
        this.state.toggleMessageExpanded(messageId);
    }

    /** Rendered row offset (0-based) of one message inside the transcript region. */
    messageRowOffset(messageId: string): number | undefined {
        return resolveMessageRowOffset(this.renderedMessageItems, messageId);
    }

    get renderedMessageItems(): AgentConsoleRenderedMessageItem[] {
        const items = this.messageItems;
        if (!this.state.messageDetailOpen) {
            return items;
        }
        // Detail view has no instructional footer row. The selected message's
        // own rows are the close affordance: clicking any row returns to the
        // transcript, while Esc keeps working everywhere.
        return items.map(item => item.lines.some(line => line.messageId === this.state.selectedMessageId)
            ? {
                ...item,
                lines: item.lines.map(line => ({ ...line, toggleMode: 'detail' as const, toggleContent: '' }))
            }
            : item);
    }

    protected resolveMarkdownToneStyle(tone: AgentConsoleMarkdownTone): Record<string, string> {
        return resolveAgentConsoleMarkdownToneStyle(tone, this.activeTheme);
    }
}

@Component({
    selector: 'agent-console-message-detail-panel',
    imports: [PanelComponent],
    template: `
    <panel :items="detailItems"></panel>
    `
})
export class AgentConsoleMessagePanelComponent {
    constructor(private state: AgentConsoleSessionState) {
    }

    @Attribute() theme: AgentConsoleTheme = defaultAgentConsoleTheme;

    protected get activeTheme(): AgentConsoleTheme {
        return this.state?.theme || this.theme || defaultAgentConsoleTheme;
    }

    get selectedMessage() {
        return this.state.selectedMessage;
    }

    get shellStyle() {
        return this.shouldShow
            ? {
                padding: '1em 1ch',
                ...(styleTextToObject(this.activeTheme.messagesShell))
            }
            : {};
    }

    get accentStyle() {
        return styleTextToObject(this.activeTheme.toolsAccent);
    }

    get hintStyle() {
        return styleTextToObject(this.activeTheme.statusLabel);
    }

    get shouldShow(): boolean {
        return !!this.selectedMessage && this.state.messageDetailOpen;
    }

    get contentLines(): string[] {
        return this.state.messageDetailLines;
    }

    get visibleLines(): string[] {
        const lines = this.contentLines;
        const start = Math.max(0, Math.min(lines.length, this.state.messageDetailScroll));
        return lines.slice(start, start + this.state.messageDetailVisibleLines);
    }

    get detailLines(): string[] {
        return this.detailIndexes.map(index => {
            const lineNumber = this.detailLineNumberAt(index);
            const prefix = this.detailLinePrefixAt(index);
            const content = this.detailLineContentAt(index);
            return `${lineNumber}${prefix}${content}`.trimEnd();
        }).filter(line => !!String(line || '').trim());
    }

    get detailItems() {
        return this.detailIndexes.map(index => {
            const line = this.detailMarkdownLineAt(index);
            return {
                lineNumber: this.detailLineNumberAt(index),
                prefix: this.detailLinePrefixAt(index),
                text: this.detailLineContentAt(index),
                prefixClass: line?.prefixTone ? `tone-${line.prefixTone}` : '',
                contentClass: line?.tone && line.tone !== 'default' ? `tone-${line.tone}` : ''
            };
        });
    }

    get detailIndexes(): number[] { return Array.from({ length: this.state.messageDetailVisibleLines }, (_value, index) => index); }

    detailLineNumberAt(index: number): string {
        if (!this.shouldShow) {
            return '';
        }
        const line = this.visibleLines[index];
        if (line == null) {
            return '';
        }
        const lineNumber = this.state.messageDetailScroll + index + 1;
        return `${String(lineNumber).padStart(3, ' ')}| `;
    }

    detailLineContentAt(index: number): string {
        if (!this.shouldShow) {
            return '';
        }
        const line = this.visibleLines[index];
        if (line == null) {
            return '';
        }
        const start = Math.max(0, this.state.messageDetailColumnScroll);
        return line.slice(start);
    }

    detailLinePrefixAt(index: number): string {
        const line = this.detailMarkdownLineAt(index);
        if (!line) {
            return '';
        }
        if (this.state.messageDetailColumnScroll > 0) {
            return '';
        }
        return line.prefix || '';
    }

    protected detailMarkdownLineAt(index: number): AgentConsoleMarkdownLine | undefined {
        const line = this.visibleLines[index];
        if (line == null || !this.selectedMessage) {
            return undefined;
        }
        const sourceLines = renderAgentConsoleMarkdownLines(this.selectedMessage.content, {
            preserveFenceMarkers: true
        });
        const sourceIndex = this.state.messageDetailScroll + index;
        return sourceLines[sourceIndex];
    }

}

