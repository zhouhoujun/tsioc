import { AgentMessage, getAgentMessageImageParts, summarizeToolDisplayText } from '@tsdi/agent';
import { Inject, Injectable, Injector, Optional, Token, Type, token } from '@tsdi/ioc';
import { TranslatorService } from '@tsdi/i18n';
import { defaultTimelineLabel, formatAgentUiLabel, type AgentUiTranslator } from './agent-ui.i18n';
import { noReact } from '@tsdi/components';
import {
    AgentConsoleMarkdownCodeData,
    AgentConsoleMarkdownLine,
    AgentConsoleMarkdownTableData,
    AgentConsoleMarkdownToken,
    AgentConsoleMarkdownTone,
    flattenAgentConsoleMarkdownLine,
    renderAgentConsoleMarkdownLines
} from './AgentConsoleMarkdown';
import { AGENT_CONSOLE_MARKDOWN_COMPONENT } from './AgentConsoleMessageComponents';
import { AgentConsoleTheme, defaultAgentConsoleTheme, styleTextToObject } from './AgentConsoleTheme';
import { getDisplayWidth, sliceByDisplayWidth } from './AgentConsoleTextWidth';
import {
    isAgentConsoleBlankMarkdownLine,
    resolveAgentConsoleLineItemStyle,
    resolveAgentConsoleMarkdownPrefixStyle,
    resolveAgentConsoleMarkdownToneStyle
} from './AgentConsoleMarkdownStyles';
import { renderAgentConsolePlainTextLines } from './markdown/spacing';
import { resolveSemanticLineMargin, resolveSemanticLinePadding, stripMentionContextBlock } from './AgentConsoleMessageLineStyles';
export { resolveAgentConsoleMarkdownPrefixStyle, resolveAgentConsoleMarkdownToneStyle } from './AgentConsoleMarkdownStyles';
import { resolveTimelineEventSentence, formatTimelineSessionDuration, AgentConsoleTimelineLabels } from './AgentConsoleTimelineWindow';
import { resolveTurnLifecycleLabel } from './AgentConsoleTimelineLabels';
import { resolvePlanTodoContent } from './AgentConsolePlanState';
import { resolveTimelineMeta, resolveTimelineMetaStyle, resolveMessageDurationMs, resolveMessageRoleLabel, resolveMessageRoleStyle, resolveAgentConsoleMessageRoleLabel, resolveEffectiveRoleLabel, shouldRenderWorkedSummary, localizeCommandExecutionStatus, localizeTimelineContentSuffix } from './AgentConsoleTimelineMeta';
import type { MarkdownWorkerBridge } from './MarkdownWorkerBridge';
import {
    AgentConsoleContentFamily,
    AgentConsoleContentKind,
    AgentConsoleSessionContentPresentation,
    presentAgentConsoleSessionContent
} from './AgentConsoleSessionContentPresenter';
import {
    AgentConsoleApprovalTemplate, AgentConsoleCommandTemplate, AgentConsoleErrorTemplate,
    AgentConsoleFilesTemplate, AgentConsolePlanTemplate, AgentConsoleQuestionTemplate,
    AgentConsoleSystemTemplate, AgentConsoleThoughtTemplate,
    AgentConsoleToolTemplate, AgentConsoleUserTemplate
} from './AgentConsoleMessageTemplates';
import {
    deriveTimelineDurations,
    formatAgentConsoleMessageStatus,
    resolveAgentConsoleMessageStatus,
    resolveAgentConsoleMessageStatusLabel,
    resolveAgentConsoleMessageStatusStyle,
    resolveDefaultStatusGlyph,
    resolveInlineRowStyle,
    resolveMessageTemplateKind,
    resolveRenderedLineToneStyle,
    resolveTimelineEventActionLabel,
    resolveTimelineEventItemStyle,
    truncateTimelineEventRowContent,
    TIMELINE_EVENT_ROW_CONTENT_MAX
} from './AgentConsoleMessageStatus';
export {
    deriveTimelineDurations,
    resolveAgentConsoleMessageStatus,
    resolveAgentConsoleMessageStatusLabel,
    resolveMessageTemplateKind,
    resolveTimelineEventActionLabel,
    truncateTimelineEventRowContent,
    TIMELINE_EVENT_ROW_CONTENT_MAX
} from './AgentConsoleMessageStatus';

export type AgentConsoleMessageTemplateKind = 'user' | 'assistant' | 'tool' | 'error' | 'system' | 'planTodo' | 'fileChange' | 'timelineBoundary' | 'timelineHeader' | 'timelineFooter' | 'timelineCollapsed';
export interface AgentConsoleRenderedToken extends AgentConsoleMarkdownToken {
    style: Record<string, string>;
}
export interface AgentConsoleRenderedLine {
    /** Stable identity used by the transcript v-for across window shifts. */
    renderKey?: string;
    messageId?: string;
    previewCollapsed?: boolean;
    toggleContent?: string;
    /** Inline rows toggle collapse in place; detail rows open the inspector. */
    toggleMode?: 'inline' | 'detail';
    statusKind?: AgentConsoleMessageStatus;
    statusLabel?: string;
    /** Screen-reader label for the row: status + prefix + content + meta (depends only on text, never color). */
    ariaLabel?: string;
    status?: string;
    statusStyle?: Record<string, string>;
    role?: string;
    roleStyle?: Record<string, string>;
    meta?: string;
    metaStyle?: Record<string, string>;
    prefix?: string;
    prefixStyle?: Record<string, string>;
    content: string;
    tokens: AgentConsoleRenderedToken[];
    itemStyle?: Record<string, string>;
    lineStyle?: Record<string, string>;
    /** Markdown list/quote continuation indent (columns). */
    continuationIndent?: number;
    tone?: AgentConsoleMarkdownTone;
    code?: boolean; codeData?: AgentConsoleMarkdownCodeData;
    table?: boolean; tableData?: AgentConsoleMarkdownTableData;
    renderRegion?: string;
    spacing?: boolean;
    semanticFamily?: AgentConsoleContentFamily;
    semanticKind?: AgentConsoleContentKind;
}
export interface AgentConsoleRenderedMessageItem {
    [noReact]?: boolean;
    kind: string;
    templateKind: AgentConsoleMessageTemplateKind;
    selected: boolean;
    statusKind?: AgentConsoleMessageStatus;
    statusLabel?: string;
    status?: string;
    statusStyle?: Record<string, string>;
    itemStyle: Record<string, string>;
    renderRegion?: string;
    lines: AgentConsoleRenderedLine[];
    semanticFamily?: AgentConsoleContentFamily;
    semanticKind?: AgentConsoleContentKind;
    component: Type<any>;
    /** Major conversation blocks start after one visual row in DOM and TUI. */
    spacerBefore?: boolean;
    /** Vertical padding applies around the whole message block. */
    blockPadding?: boolean;
}

export type AgentConsoleMessageStatus = 'running' | 'success' | 'failed' | 'error' | 'blocked';

export interface AgentConsoleMessageStatusLabels {
    running?: string;
    success?: string;
    failed?: string;
    error?: string;
    blocked?: string;
}

export type AgentConsoleInlineRowStyle = Partial<Record<'background' | 'background-color' | 'color' | 'font-weight', string>>;

export interface AgentConsoleMessageRenderContext {
    theme?: AgentConsoleTheme;
    selectedMessageId?: string;
    messagesFocused?: boolean;
    streaming?: boolean;
    statusLabels?: AgentConsoleMessageStatusLabels;
    statusSymbol?: string;
    rawMode?: boolean;
    showTimestamps?: boolean;
    showToolOutput?: boolean;
    showUsername?: boolean;
    username?: string;
    timelineMode?: boolean;
    /** i18n labels for timeline event sentences (empty-content events like model_completed). */
    timelineLabels?: AgentConsoleTimelineLabels; translator?: AgentUiTranslator;
    /** When true, all messages carry the critical mark (★) and render uncollapsed. */
    showCriticalMarks?: boolean;
    /** When provided, long messages (>1000 chars) are routed through the bridge for off-main-thread parsing. */
    markdownBridge?: MarkdownWorkerBridge;
    rendererRegistry?: AgentConsoleMessageRendererRegistry;
    messageDetailOpen?: boolean;
    messageDetailVisibleLines?: number;
    /** Terminal column budget for grid tables; 0/undefined uses the shared fallback. */
    markdownContentWidth?: number;
}

export interface AgentConsoleResolvedMessageRenderer {
    templateKind: AgentConsoleMessageTemplateKind;
    roleLabel: string;
    roleStyle: (theme: AgentConsoleTheme) => Record<string, string>;
    itemStyle: (theme: AgentConsoleTheme, rowSelected: boolean) => Record<string, string>;
    lead: (rowSelected: boolean) => string;
    continuationLead: (rowSelected: boolean) => string;
}

export { AgentConsoleMessageRendererRegistry, AGENT_CONSOLE_MESSAGE_RENDERER_ROUTES, AgentConsoleMessageRenderer, AgentConsoleUserRenderer, AgentConsoleAnswerRenderer, AgentConsolePartialRenderer, AgentConsolePreambleRenderer, AgentConsoleDecisionMessageRenderer, AgentConsoleArtifactMessageRenderer, AgentConsoleKindRenderer, AgentConsoleThoughtMessageRenderer, AgentConsoleToolMessageRenderer, AgentConsoleCommandMessageRenderer, AgentConsolePlanMessageRenderer, AgentConsoleFilesMessageRenderer, AgentConsoleQuestionMessageRenderer, AgentConsoleApprovalMessageRenderer, AgentConsoleErrorMessageRenderer, AgentConsoleDiagnosticMessageRenderer, AgentConsoleAttachmentRenderer } from './AgentConsoleMessageRendererRegistry';
export type { AgentConsoleMessageRendererRoutes, AgentConsoleMessageRenderRequest, AgentConsoleMessageRenderResponse } from './AgentConsoleMessageRendererRegistry';
import { AgentConsoleMessageRendererRegistry, resolveBuiltinMessageRenderer } from './AgentConsoleMessageRendererRegistry';

export {
    renderAgentConsoleMessageItem,
    renderAgentConsoleMessageItems
} from './AgentConsoleMessageItemRenderer';
