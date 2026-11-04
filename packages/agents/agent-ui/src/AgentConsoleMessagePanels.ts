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
    buildCommonBrandBlock as buildTerminalBrandBlock,
    DialogComponent,
    DetailPanelComponent,
    InputFieldComponent,
    ListPanelComponent,
    MessageRowComponent,
    SelectComponent,
    resolveCommonEnterAction as resolveConsoleEnterAction,
    resolveCommonListWindow as resolveConsoleListWindow,
    resolveCommonSelectWindow as resolveConsoleSelectWindow
} from '@tsdi/components/common';
import { messageItemsCache } from './AgentConsoleMessageCache';
@Component({
    selector: 'agent-console-message-line',
    imports: [MessageRowComponent],
    template: `
    <message-row :tokens="contentTokens" :status="status" :role="role" :prefix="prefix" :meta="meta" :toggleContent="toggleContent" :ariaLabel="ariaLabel" :hoverable="!!line?.toggleMode" :toggleAction="toggleMessageDetail"></message-row>
    `
})
export class AgentConsoleMessageLineComponent {
    @Attribute() line?: AgentConsoleRenderedLine;

    constructor(private state: AgentConsoleSessionState) {}

    get role(): string {
        return this.line?.role || '';
    }

    get status(): string {
        return this.line?.status || '';
    }

    get prefix(): string {
        return this.line?.prefix || '';
    }

    get meta(): string {
        return this.line?.meta || '';
    }

    get ariaLabel(): string {
        return this.line?.ariaLabel || '';
    }

    get toggleContent(): string { return this.line?.toggleContent || ''; }
    toggleMessageDetail(): void {
        if (this.state.messageLayout !== 'viewport') return;
        const messageId = String(this.line?.messageId || '').trim();
        if (!messageId) return;
        if (this.line?.toggleMode === 'inline') {
            this.state.setSelectedMessageId(messageId);
            this.state.toggleMessageExpanded(messageId);
            return;
        }
        this.state.setMessagesFocused(true);
        if (!this.toggleContent) return;
        if (this.state.messageDetailOpen && this.state.selectedMessageId === messageId) {
            this.state.closeMessageDetail();
            return;
        }
        this.state.setSelectedMessageId(messageId);
        this.state.openMessageDetail(false);
    }
    get tokens(): Array<AgentConsoleMarkdownToken & { style: Record<string, string> }> {
        return this.line?.tokens || [];
    }

    get contentTokens(): Array<AgentConsoleMarkdownToken & { style: Record<string, string> }> {
        return this.line?.previewCollapsed ? [] : this.tokens;
    }

}

const MESSAGE_ITEM_TEMPLATE = `
    <div class="message-block-spacing" v-if="spacerBefore">​</div>
    <div class="message-item-block" v-style="blockStyle">
        <agent-console-message-line v-for="line in lines" :line="line"></agent-console-message-line>
    </div>
`;

abstract class AgentConsoleMessageItemComponentBase {
    protected item?: AgentConsoleRenderedMessageItem;

    get lines(): AgentConsoleRenderedLine[] {
        return this.item?.lines || [];
    }

    get spacerBefore(): boolean {
        return !!this.item?.spacerBefore;
    }

    get blockStyle(): Record<string, string> {
        if (!this.item?.blockPadding) return {};
        return {
            ...(this.item.itemStyle || {}),
            padding: '1em 0',
            margin: '0'
        };
    }
}

@Component({
    selector: 'agent-console-user-message-item',
    imports: [AgentConsoleMessageLineComponent],
    template: MESSAGE_ITEM_TEMPLATE
})
export class AgentConsoleUserMessageItemComponent extends AgentConsoleMessageItemComponentBase {
    @Attribute() item?: AgentConsoleRenderedMessageItem;
}

@Component({
    selector: 'agent-console-assistant-message-item',
    imports: [AgentConsoleMessageLineComponent],
    template: MESSAGE_ITEM_TEMPLATE
})
export class AgentConsoleAssistantMessageItemComponent extends AgentConsoleMessageItemComponentBase {
    @Attribute() item?: AgentConsoleRenderedMessageItem;
}

@Component({
    selector: 'agent-console-tool-message-item',
    imports: [AgentConsoleMessageLineComponent],
    template: MESSAGE_ITEM_TEMPLATE
})
export class AgentConsoleToolMessageItemComponent extends AgentConsoleMessageItemComponentBase {
    @Attribute() item?: AgentConsoleRenderedMessageItem;
}

@Component({
    selector: 'agent-console-error-message-item',
    imports: [AgentConsoleMessageLineComponent],
    template: MESSAGE_ITEM_TEMPLATE
})
export class AgentConsoleErrorMessageItemComponent extends AgentConsoleMessageItemComponentBase {
    @Attribute() item?: AgentConsoleRenderedMessageItem;
}

@Component({
    selector: 'agent-console-system-message-item',
    imports: [AgentConsoleMessageLineComponent],
    template: MESSAGE_ITEM_TEMPLATE
})
export class AgentConsoleSystemMessageItemComponent extends AgentConsoleMessageItemComponentBase {
    @Attribute() item?: AgentConsoleRenderedMessageItem;
}
export * from './AgentConsoleMessageListPanels';
