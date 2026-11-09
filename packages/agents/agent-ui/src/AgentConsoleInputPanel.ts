import { Attribute, Component, ReactiveEffect, reactive } from '@tsdi/components';
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
export * from './AgentConsoleOverlayPanels';
export * from './AgentConsoleTaskPanels';
export * from './AgentConsoleResourcePanels';
@Component({
    selector: 'agent-console-input-panel',
    imports: [InputFieldComponent],
    template: `
    <div class="console-panel console-input-panel">
        <div class="input-shell" blockGap="none">
            <div class="input-entry">
                <input-field :value="input" :prompt="inputPromptBase" :placeholder="inputPlaceholderLabel" :cursorPos="inputCursor" :focused="inputFocused" :continuationPrompt="'  '" :mask="inputSecret" @inputAction="onInput" @cursorAction="onCursorChange" @keydownAction="onKeydown"></input-field>
            </div>
            <div class="wizard-banner" v-show="wizardOpen">
                <label class="wizard-title">{{wizardTitleLabel}}</label>
                <label class="wizard-step">{{wizardStepLabel}}</label>
                <label class="wizard-help" v-show="wizardHelpLabel">{{wizardHelpLabel}}</label>
                <label class="wizard-summary" v-show="wizardSummaryLabel">{{wizardSummaryLabel}}</label>
                <label class="wizard-hint" v-show="wizardHintLabel">{{wizardHintLabel}}</label>
            </div>
        </div>
        <label class="input-meta"><span v-show="metaPrefixLabel">{{metaPrefixLabel}} · </span>{{totalTokens | number-format}} tokens<span v-show="inputBadgeLabel">{{inputBadgeLabel}}</span></label>
    </div>
    `
})
export class AgentConsoleInputPanelComponent {
    constructor(private state?: AgentConsoleSessionState, @Optional() private translator?: TranslatorService) {}

    @Attribute() theme: AgentConsoleTheme = defaultAgentConsoleTheme;
    @Attribute() submitAction?: () => Promise<void>;

    protected get activeTheme(): AgentConsoleTheme {
        return this.state?.theme || this.theme || defaultAgentConsoleTheme;
    }

    protected get activeThemeStyles(): AgentConsoleThemeStyles {
        return resolvePanelThemeStyles(this.state, this.theme);
    }

    get input(): string {
        return this.state?.input || '';
    }

    get inputSecret(): boolean {
        return !!this.state?.inputSecret;
    }

    set input(value: string) {
        this.state?.setInput(value, value.length);
    }

    get titleStyle() {
        return this.activeThemeStyles.inputTitle;
    }

    get inputCursor(): number {
        return this.state?.inputCursor ?? this.input.length;
    }

    get inputFocused(): boolean {
        return this.state?.inputFocused !== false;
    }

    get shellStyle() {
        return this.activeThemeStyles.inputShell;
    }

    get captionStyle() {
        return this.activeThemeStyles.inputCaption;
    }

    get inputPromptBase(): string { return this.state?.inputPrompt || this.state?.consoleOptions?.inputPrompt || ''; }
    get inputBadgeLabel(): string { const badges = formatAgentConsoleInputBadges(this.state, this.translator); return badges.length ? ` · ${badges.join(' · ')}` : ''; }
    get inputPrompt(): string { return `${this.inputPromptBase}${this.inputBadgeLabel}`; }

    get inputPlaceholderLabel(): string {
        return this.state?.inputPlaceholderLabel || '';
    }

    get wizardOpen(): boolean {
        return !!this.state?.providerWizard?.open;
    }

    get wizardTitleLabel(): string {
        const wizard = this.state?.providerWizard;
        const title = formatAgentUiLabel(this.translator, 'agent.menu.provider.title', 'Add provider');
        return wizard?.open ? `${title} · ${wizard.progress || ''}`.trim() : '';
    }

    get wizardStepLabel(): string {
        return this.state?.providerWizard?.stepLabel || '';
    }

    get wizardHelpLabel(): string {
        return this.state?.providerWizard?.help || '';
    }

    get wizardSummaryLabel(): string {
        return this.state?.providerWizard?.summary.join(' · ') || '';
    }

    get wizardHintLabel(): string {
        return this.state?.providerWizard?.hint || '';
    }

    get wizardTitleStyle() {
        return this.activeThemeStyles.inputTitle;
    }

    get wizardStepStyle() {
        return this.activeThemeStyles.inputCaption;
    }

    get wizardHelpStyle() {
        return this.activeThemeStyles.inputHint || this.activeThemeStyles.inputCaption;
    }

    get wizardHintStyle() {
        return this.activeThemeStyles.inputCaption;
    }

    get entryStyle() {
        return this.activeThemeStyles.inputField;
    }

    get entryShellStyle() {
        return this.activeThemeStyles.inputEntry;
    }

    get promptStyle() {
        return this.activeThemeStyles.inputPrompt;
    }

    get fieldStyle() {
        return this.inputSecret
            ? { ...this.activeThemeStyles.inputField, '-webkit-text-security': 'disc' }
            : this.activeThemeStyles.inputField;
    }

    get hintStyle() {
        return this.activeThemeStyles.inputHint;
    }

    get hintLabel(): string {
        return this.state?.inputHintLabel || '';
    }

    get totalTokens(): number {
        return this.state?.tokenUsage?.totalTokens ?? 0;
    }

    get metaPrefixLabel(): string {
        const planNudge = this.state?.planNudgeActive ? panelLabel(this.translator, 'input', 'planNudge', 'Planning intent detected · use /plan') : '';
        return [this.state?.providerWizardLabel, planNudge, this.hintLabel].filter(Boolean).join(' · ');
    }

    get metaLabel(): string {
        return this.metaPrefixLabel;
    }

    async submit(): Promise<void> {
        await (this.submitAction || this.state?.submitAction)?.();
    }

    protected syncTextareaState(target?: HTMLTextAreaElement | null): void {
        if (!target || !this.state) {
            return;
        }
        const value = this.state.input || '';
        const cursor = this.state.inputCursor ?? value.length;
        if (target.value !== value) {
            target.value = value;
        }
        if (typeof target.setSelectionRange === 'function') {
            target.setSelectionRange(cursor, cursor);
        }
        target.focus?.();
    }

    onInput(event: Event): void {
        const target = event?.target as HTMLTextAreaElement | null;
        const value = String(target?.value || '');
        const cursor = typeof target?.selectionStart === 'number'
            ? target.selectionStart
            : value.length;
        this.state?.setInput(value, cursor);
        this.state?.inputHistoryController.resetNavigation();
    }

    onCursorChange(event: Event): void {
        const target = event?.target as HTMLTextAreaElement | null;
        if (typeof target?.selectionStart === 'number') {
            this.state?.setInputCursor(target.selectionStart);
        }
    }

    protected isEnterKey(event: KeyboardEvent): boolean {
        const key = String(event?.key || '').trim().toLowerCase();
        const code = String(event?.code || '').trim().toLowerCase();
        return key === 'enter'
            || key === 'return'
            || code === 'enter'
            || code.endsWith('enter');
    }

    protected isEscapeKey(event: KeyboardEvent): boolean {
        const key = String(event?.key || '').trim().toLowerCase();
        const code = String(event?.code || '').trim().toLowerCase();
        return key === 'escape' || key === 'esc' || code === 'escape';
    }

    async onKeydown(event: KeyboardEvent): Promise<void> {
        const key = String(event?.key || event?.code || '');
        if ((key === 'ArrowUp' || key === 'ArrowDown')
            && !(this.state?.selectMenu && isAgentConsoleSuggestionMenu(this.state.selectMenu))) {
            const handled = this.state?.inputHistoryController.navigate(key === 'ArrowUp' ? -1 : 1);
            if (handled) {
                this.syncTextareaState(event.target as HTMLTextAreaElement | null);
                event.preventDefault?.();
                return;
            }
        }
        if (await this.state?.globalKeyInputAction?.(event.key, { ctrlKey: event.ctrlKey, metaKey: event.metaKey, shiftKey: event.shiftKey })) {
            event.preventDefault?.();
            return;
        }
        if (event.key === 'Tab'
            && !event.ctrlKey && !event.metaKey && !event.altKey
            && (this.state?.status === 'running' || this.state?.status === 'reasoning')
            && this.state?.input.trim()
            && isAgentConsoleSuggestionMenu(this.state?.selectMenu)) {
            const queued = await this.state?.queueDraftAction?.();
            if (queued) {
                event.preventDefault?.();
                return;
            }
        }
        if (this.state?.selectMenu) {
            if (this.isEnterKey(event)) {
                event.preventDefault?.();
                await this.state.processRawChunk('\r', {
                    submitOnEnter: true,
                    ctrlKey: event.ctrlKey,
                    altKey: event.altKey,
                    hasSelectMenu: true
                });
                return;
            }
            if (this.state.focusLayers.handleSelectKey(event.key)) {
                event.preventDefault?.();
                return;
            }
        }
        if (this.state?.vimMode) {
            if (this.state.inputMode === 'insert' && this.isEscapeKey(event)) {
                event.preventDefault?.();
                this.state.setInputMode('normal');
                return;
            }
            if (this.state.inputMode === 'normal') {
                if (!event.ctrlKey && !event.metaKey && !event.altKey) {
                    event.preventDefault?.();
                    this.state.handleVimKey(event.key);
                    this.syncTextareaState(event.target as HTMLTextAreaElement | null);
                    return;
                }
            }
        }
        if (event.key === 'Tab' && !event.ctrlKey && !event.metaKey && !event.altKey) {
            const queued = await this.state?.queueDraftAction?.();
            if (queued) {
                event.preventDefault?.();
                return;
            }
            return;
        }
        if (this.isEnterKey(event)) {
            const enterAction = resolveConsoleEnterAction({
                ctrlKey: event.ctrlKey,
                altKey: event.altKey,
                hasSelectMenu: !!this.state?.selectMenu
            });
            if (enterAction === 'confirm-selection') {
                event.preventDefault?.();
                await this.state?.confirmSelectMenu();
                return;
            }
            if (enterAction !== 'submit') {
                return;
            }
            event.preventDefault?.();
            await this.submit();
            return;
        }
    }
}

