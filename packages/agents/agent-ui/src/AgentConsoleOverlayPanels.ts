import { Attribute, Component } from '@tsdi/components';
import { formatCompactNumber } from '@tsdi/core';
import { Optional } from '@tsdi/ioc';
import { TranslatorService } from '@tsdi/i18n';
import { formatAgentUiLabel, formatAgentKeymapActionLabel, formatAgentPanelLabel as panelLabel, formatAgentPanelStatusLabel as panelStatusLabel } from './agent-ui.i18n';
import { formatAgentConsoleInputBadges } from './AgentConsoleInputBadges';
import { formatAgentMessageDetailSummary } from './AgentConsoleMessageDetailMeta';
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
    AgentConsoleMessageRendererRegistry,
    resolveAgentConsoleMarkdownToneStyle
} from './AgentConsoleMessageRenderers';
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
    DialogComponent,
    DetailPanelComponent,
    InputFieldComponent,
    ListPanelComponent,
    MessageRowComponent,
    SelectComponent,
    resolveEnterAction as resolveConsoleEnterAction,
    resolveListWindow as resolveConsoleListWindow,
    resolveSelectWindow as resolveConsoleSelectWindow
} from '@tsdi/components/common';
export * from './AgentConsoleMessagePanels';
@Component({
    selector: 'agent-console-text-overlay-panel',
    imports: [DialogComponent],
    template: `
    <dialog-panel :title="overlayTitle" :lines="visibleLines" :hint="hintLabel" :ariaLabel="accessibilityLabel" @closeAction="closeOverlay"></dialog-panel>
    `
})
export class AgentConsoleTextOverlayPanelComponent {
    constructor(private state: AgentConsoleSessionState, @Optional() private translator?: TranslatorService) {
    }

    @Attribute() theme: AgentConsoleTheme = defaultAgentConsoleTheme;

    protected get activeThemeStyles(): AgentConsoleThemeStyles {
        return resolvePanelThemeStyles(this.state, this.theme);
    }

    get shellStyle() { return this.state.hasTextOverlayFocus() ? this.activeThemeStyles.dialogShell : {}; } get closeStyle() { return DIALOG_CLOSE_STYLE; }

    closeOverlay(): void { this.state.closeTextOverlay(); }

    get accentStyle() {
        return this.activeThemeStyles.toolRunsAccent;
    }

    get metaStyle() {
        return this.activeThemeStyles.statusLabel;
    }

    get listStyle() {
        return this.activeThemeStyles.statusValue;
    }

    get overlayTitle(): string {
        const overlay = this.state.textOverlay;
        if (!overlay) {
            return '';
        }
        const to = Math.min(overlay.lines.length, overlay.scroll + Math.min(overlay.lines.length, overlay.visibleLines ?? this.state.consoleOptions.reviewDetailVisibleLines));
        return panelLabel(this.translator, 'overlay', 'title', '{title} {count} lines · {from}-{to}', { title: overlay.title, count: overlay.lines.length, from: overlay.scroll + 1, to }).trim();
    }

    get visibleLines(): string[] {
        return this.state.textOverlayVisibleLines;
    }

    get hintLabel(): string {
        return this.state.hasTextOverlayFocus() ? panelLabel(this.translator, 'overlay', 'hint', 'Esc close · ↑↓ scroll') : '';
    }

    get accessibilityLabel(): string {
        const overlay = this.state.textOverlay;
        if (!overlay) {
            return panelLabel(this.translator, 'overlay', 'ariaTitle', 'Text details');
        }
        const to = Math.min(overlay.lines.length, overlay.scroll + Math.min(overlay.lines.length, overlay.visibleLines ?? this.state.consoleOptions.reviewDetailVisibleLines));
        return panelLabel(this.translator, 'overlay', 'aria', '{title}. {count} lines. Showing {from} through {to}.', { title: overlay.title, count: overlay.lines.length, from: overlay.scroll + 1, to });
    }
}

@Component({
    selector: 'agent-console-outputs-panel',
    imports: [ListPanelComponent],
    template: `
    <list-panel :header="panelTitle" :meta="filterLabel" :items="entryItems" :empty="emptyLabel" :hint="hintLabel" :showClose="false" :ariaLabel="accessibilityLabel" :listLabel="'Command output history'" :activeOptionId="activeOptionId"></list-panel>
    `
})
export class AgentConsoleCommandOutputsPanelComponent {
    constructor(private state: AgentConsoleSessionState, @Optional() private translator?: TranslatorService) {
    }

    @Attribute() theme: AgentConsoleTheme = defaultAgentConsoleTheme;

    protected get activeThemeStyles(): AgentConsoleThemeStyles {
        return resolvePanelThemeStyles(this.state, this.theme);
    }

    get shellStyle() {
        return this.state.hasCommandOutputsFocus() ? this.activeThemeStyles.toolRunsShell : {};
    }

    get accentStyle() {
        return this.activeThemeStyles.toolRunsAccent;
    }

    get metaStyle() {
        return this.activeThemeStyles.statusLabel;
    }

    get panelTitle(): string {
        const entries = this.state.visibleCommandOutputs;
        const total = this.state.commandOutputs.length;
        const selected = this.state.commandOutputsSelectedIndex;
        const visible = this.state.consoleOptions.reviewDetailVisibleLines;
        const range = entries.length
            ? `${selected + 1}-${Math.min(entries.length, selected + visible)}`
            : '0-0';
        return entries.length !== total
            ? panelLabel(this.translator, 'outputs', 'title', 'command outputs {visible}/{total} · {range}', { visible: entries.length, total, range })
            : panelLabel(this.translator, 'outputs', 'titleAll', 'command outputs {total} · {range}', { total, range });
    }

    get filterLabel(): string {
        return this.state.commandOutputsFilterMode
            ? panelLabel(this.translator, 'outputs', 'filter', 'filter: {filter}', { filter: this.state.commandOutputsFilter })
            : '';
    }

    get entryItems(): Array<{ id: string; label: string; style: Record<string, string>; selected: string }> {
        const base = this.activeThemeStyles.statusValue;
        const selected = this.activeThemeStyles.messagesSelected || this.activeThemeStyles.sessionsSelected;
        return this.state.visibleCommandOutputs.map((entry, index) => {
            const preview = String(entry.text || '').replace(/\s+/g, ' ').trim();
            const text = preview.length > 160 ? `${preview.slice(0, 160)}…` : preview;
            const marker = entry.kind === 'error' ? '✗ ' : entry.kind === 'notice' ? '• ' : '';
            return {
                id: `command-output-option-${entry.id}`,
                label: `${marker}${entry.command}  ${text}`,
                selected: String(index === this.state.commandOutputsSelectedIndex),
                style: index === this.state.commandOutputsSelectedIndex
                    ? { ...base, ...selected }
                    : base
            };
        });
    }

    get emptyLabel(): string {
        if (this.state.commandOutputs.length === 0) {
            return panelLabel(this.translator, 'outputs', 'empty', 'No command outputs yet.');
        }
        if (this.state.visibleCommandOutputs.length === 0) {
            return panelLabel(this.translator, 'outputs', 'emptyFiltered', 'No matching command outputs.');
        }
        return '';
    }

    get hintLabel(): string {
        return this.state.hasCommandOutputsFocus()
            ? panelLabel(this.translator, 'outputs', 'hint', 'Esc close · ↑↓/jk move · / filter · Enter copy')
            : '';
    }

    get accessibilityLabel(): string {
        const entries = this.state.visibleCommandOutputs;
        if (!entries.length) {
            return panelLabel(this.translator, 'outputs', 'ariaEmpty', 'Command output history. No command outputs.');
        }
        const selected = entries[this.state.commandOutputsSelectedIndex];
        return panelLabel(this.translator, 'outputs', 'aria', 'Command output history. {count} entries. Selected {index} of {count}: {command}.', { count: entries.length, index: this.state.commandOutputsSelectedIndex + 1, command: selected?.command || panelLabel(this.translator, 'outputs', 'ariaNone', 'none') });
    }

    get activeOptionId(): string {
        return this.entryItems[this.state.commandOutputsSelectedIndex]?.id || '';
    }
}

@Component({
    selector: 'agent-console-pending-question-panel',
    imports: [ListPanelComponent],
    template: `
    <list-panel :header="pendingQuestionHeader" :title="pendingQuestionTitle" :context="pendingQuestionContext" :meta="pendingQuestionExpiryHint" :hint="pendingQuestionSelectionHint" :secondaryHint="pendingQuestionCustomHint" :items="pendingQuestionOptionItems" :showClose="true" :closeLabel="'✕'" :ariaLabel="accessibilityLabel" :listLabel="'Question options'" :activeOptionId="activeOptionId" @closeAction="closeQuestion" @selectAction="onPendingQuestionOptionClick"></list-panel>
    `
})
export class AgentConsolePendingQuestionPanelComponent {
    constructor(private state: AgentConsoleSessionState, @Optional() private translator?: TranslatorService) {
    }

    @Attribute() theme: AgentConsoleTheme = defaultAgentConsoleTheme;

    protected get activeThemeStyles(): AgentConsoleThemeStyles {
        return resolvePanelThemeStyles(this.state, this.theme);
    }

    get shellStyle() { return menuShellStyle(this.state.theme || this.theme || defaultAgentConsoleTheme); } get closeStyle() { return DIALOG_CLOSE_STYLE; }
    async closeQuestion(): Promise<void> { await this.state.dismissPendingQuestion(); }

    get accentStyle() {
        return this.activeThemeStyles.toolRunsAccent;
    }

    get metaStyle() {
        return this.activeThemeStyles.statusLabel;
    }

    get listStyle() {
        return this.activeThemeStyles.statusValue;
    }

    get pendingQuestionTitle(): string {
        const question = this.state.pendingQuestion;
        if (!question) {
            return '';
        }
        const severity = question.severity === 'high' ? '[high] ' : '';
        const total = this.state.pendingQuestionTotal;
        const position = total > 1 ? ` [${1}/${total}]` : '';
        return `${severity}? ${question.question}${position}`;
    }

    get pendingQuestionHeader(): string {
        const question = this.state.pendingQuestion;
        if (!question) {
            return '';
        }
        const total = this.state.pendingQuestionTotal;
        return total > 1 ? panelLabel(this.translator, 'question', 'queued', 'Awaiting your answer · {count} queued', { count: total }) : panelLabel(this.translator, 'question', 'title', 'Awaiting your answer');
    }

    get pendingQuestionContext(): string {
        return this.state.pendingQuestion?.context || '';
    }

    get pendingQuestionExpiryHint(): string {
        const expiresAt = this.state.pendingQuestion?.expiresAt;
        if (!expiresAt) {
            return '';
        }
        if (Date.now() > expiresAt) {
            return panelLabel(this.translator, 'question', 'expired', 'Expired');
        }
        const remainingMs = expiresAt - Date.now();
        const minutes = Math.max(1, Math.ceil(remainingMs / 60000));
        const hours = Math.floor(minutes / 60);
        const rest = minutes % 60;
        return hours >= 1 ? (rest ? panelLabel(this.translator, 'question', 'expiresHoursMinutes', 'Expires in {hours}h {minutes}m', { hours, minutes: rest }) : panelLabel(this.translator, 'question', 'expiresHours', 'Expires in {hours}h', { hours })) : panelLabel(this.translator, 'question', 'expiresMinutes', 'Expires in {minutes}m', { minutes });
    }

    get pendingQuestionOptionItems(): Array<{ id: string; label: string; value: string; selected: string }> {
        return (this.state.pendingQuestion?.options || []).map((option, index) => ({
            id: `pending-question-option-${index}`,
            label: `${index + 1}. ${option}`,
            value: option,
            selected: String(index === this.state.pendingQuestionSelectedIndex)
        }));
    }

    get pendingQuestionSelectionHint(): string {
        const count = this.pendingQuestionOptionItems.length;
        if (!count) return '';
        const selected = Math.min(this.state.pendingQuestionSelectedIndex + 1, count);
        return panelLabel(this.translator, 'question', 'selectionHint', 'selected {selected}/{count} · ↑↓ move · 1-9 pick · Enter confirm · Esc dismiss', { selected, count });
    }

    get pendingQuestionCustomHint(): string {
        const question = this.state.pendingQuestion;
        if (!question || !this.state.questionAction) {
            return '';
        }
        const typed = String(this.state.input || '').trim();
        return typed
            ? panelLabel(this.translator, 'question', 'customAnswer', 'Custom answer: {text} · Enter to send', { text: typed })
            : panelLabel(this.translator, 'question', 'customHint', 'Or type your own answer, then press Enter');
    }

    get accessibilityLabel(): string {
        const question = this.state.pendingQuestion;
        if (!question) {
            return panelLabel(this.translator, 'question', 'ariaTitle', 'Question');
        }
        const count = question.options.length;
        return panelLabel(this.translator, 'question', 'aria', 'Question: {question}. {count} options. Selected {index} of {count}.', { question: question.question, count, index: Math.min(this.state.pendingQuestionSelectedIndex + 1, count) });
    }

    get activeOptionId(): string {
        return this.pendingQuestionOptionItems[this.state.pendingQuestionSelectedIndex]?.id || '';
    }

    async onPendingQuestionOptionClick(option: string): Promise<void> {
        const index = this.state.pendingQuestion?.options.indexOf(option) ?? -1;
        if (index >= 0) {
            await this.state.choosePendingQuestion(index);
        }
    }
}

