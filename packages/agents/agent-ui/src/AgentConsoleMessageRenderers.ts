import { AgentMessage, getAgentMessageImageParts, summarizeToolDisplayText } from '@tsdi/agent';
import { Inject, Injectable, Injector, Optional, Token, Type, token } from '@tsdi/ioc';
import { TranslatorService } from '@tsdi/i18n';
import { defaultTimelineLabel, formatAgentUiLabel, type AgentUiTranslator } from './agent-ui.i18n';
import { noReact } from '@tsdi/components';
import {
    AgentConsoleMarkdownLine,
    AgentConsoleMarkdownToken,
    AgentConsoleMarkdownTone,
    flattenAgentConsoleMarkdownLine,
    renderAgentConsoleMarkdownLines
} from './AgentConsoleMarkdown';
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
import { resolveTimelineMeta, resolveTimelineMetaStyle, resolveMessageDurationMs, resolveMessageRoleLabel, resolveMessageRoleStyle, resolveAgentConsoleMessageRoleLabel, resolveEffectiveRoleLabel, shouldRenderWorkedSummary, localizeCommandExecutionStatus, localizeTimelineContentSuffix, resolveTimelineDetailToggle } from './AgentConsoleTimelineMeta';
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
    AgentConsoleMarkdownComponent, AgentConsoleSystemTemplate, AgentConsoleThoughtTemplate,
    AgentConsoleToolTemplate, AgentConsoleUserTemplate
} from './AgentConsoleMessageTemplates';

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

type AgentConsoleInlineRowStyle = Partial<Record<'background' | 'background-color' | 'color' | 'font-weight', string>>;

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

/** IoC extension point for content-specific message display. */
export abstract class AgentConsoleMessageRenderer {
    abstract resolve(message: AgentMessage, templateKind: AgentConsoleMessageTemplateKind): AgentConsoleMessageRenderResponse;
}

export interface AgentConsoleMessageRenderRequest {
    message: AgentMessage;
    templateKind: AgentConsoleMessageTemplateKind;
}

export interface AgentConsoleMessageRenderResponse {
    presentation: AgentConsoleResolvedMessageRenderer;
    component: Type<any>;
}

/** Route map follows the shared request router contract: request path -> handler token. */
export type AgentConsoleMessageRendererRoutes = Partial<Record<AgentConsoleContentKind, Token<AgentConsoleMessageRenderer>>>;
export const AGENT_CONSOLE_MESSAGE_RENDERER_ROUTES = token<AgentConsoleMessageRendererRoutes>('AGENT_CONSOLE_MESSAGE_RENDERER_ROUTES');

@Injectable()
export class AgentConsoleMessageRendererRegistry {
    constructor(
        private injector: Injector,
        @Inject(AGENT_CONSOLE_MESSAGE_RENDERER_ROUTES, { defaultValue: {} })
        private routes: AgentConsoleMessageRendererRoutes = {}
    ) {}

    resolve(message: AgentMessage, templateKind: AgentConsoleMessageTemplateKind): AgentConsoleMessageRenderResponse {
        const request: AgentConsoleMessageRenderRequest = { message, templateKind };
        const kind = presentAgentConsoleSessionContent(message).kind;
        const route = this.routes[kind];
        const renderer = route && !this.injector.destroyed
            ? this.injector.get(route, undefined)
            : undefined;
        return renderer?.resolve(request.message, request.templateKind) || {
            presentation: resolveBuiltinMessageRenderer(request.templateKind),
            component: AgentConsoleSystemTemplate
        };
    }
}

abstract class AgentConsoleFamilyMessageRenderer extends AgentConsoleMessageRenderer {
    resolve(_message: AgentMessage, templateKind: AgentConsoleMessageTemplateKind): AgentConsoleMessageRenderResponse {
        return {
            presentation: resolveBuiltinMessageRenderer(templateKind),
            component: AgentConsoleSystemTemplate
        };
    }
}

@Injectable()
export class AgentConsoleUserRenderer extends AgentConsoleFamilyMessageRenderer {
    override resolve(message: AgentMessage, templateKind: AgentConsoleMessageTemplateKind): AgentConsoleMessageRenderResponse {
        return { ...super.resolve(message, templateKind), component: AgentConsoleUserTemplate };
    }
}

@Injectable()
export class AgentConsoleAnswerRenderer extends AgentConsoleFamilyMessageRenderer {
    override resolve(message: AgentMessage, templateKind: AgentConsoleMessageTemplateKind): AgentConsoleMessageRenderResponse {
        const presentation = super.resolve(message, templateKind).presentation;
        return { component: AgentConsoleMarkdownComponent, presentation: {
            ...presentation,
            roleLabel: '',
            itemStyle: (theme, selected) => ({
                ...presentation.itemStyle(theme, selected),
                margin: '0'
            })
        } };
    }
}

@Injectable()
export class AgentConsolePartialRenderer extends AgentConsoleFamilyMessageRenderer {
    override resolve(message: AgentMessage, templateKind: AgentConsoleMessageTemplateKind): AgentConsoleMessageRenderResponse {
        return { ...super.resolve(message, templateKind), component: AgentConsoleMarkdownComponent };
    }
}

@Injectable()
export class AgentConsolePreambleRenderer extends AgentConsoleFamilyMessageRenderer {
    override resolve(message: AgentMessage, templateKind: AgentConsoleMessageTemplateKind): AgentConsoleMessageRenderResponse {
        const response = super.resolve(message, templateKind);
        // Preamble is ordinary assistant prose; a `Context ·` label made the
        // same speaker read as two authors (opencode parity).
        return { component: AgentConsoleMarkdownComponent, presentation: { ...response.presentation, roleLabel: '' } };
    }
}

@Injectable()
export class AgentConsoleDecisionMessageRenderer extends AgentConsoleFamilyMessageRenderer {
    override resolve(message: AgentMessage, templateKind: AgentConsoleMessageTemplateKind): AgentConsoleMessageRenderResponse {
        const response = super.resolve(message, templateKind);
        return { ...response, presentation: { ...response.presentation, roleLabel: 'Decision · ' } };
    }
}

@Injectable()
export class AgentConsoleArtifactMessageRenderer extends AgentConsoleFamilyMessageRenderer {
}

type AgentConsoleKindRendererTone = 'muted' | 'accent' | 'attention' | 'error';

/** IoC route handler for one semantic content kind. */
export abstract class AgentConsoleKindRenderer extends AgentConsoleMessageRenderer {
    constructor(@Optional() @Inject(TranslatorService) protected translator?: TranslatorService) { super(); }
    abstract readonly kind: AgentConsoleContentKind;
    abstract readonly label: string;
    abstract readonly component: Type<any>;
    readonly tone: AgentConsoleKindRendererTone = 'muted';

    resolve(_message: AgentMessage, templateKind: AgentConsoleMessageTemplateKind): AgentConsoleMessageRenderResponse {
        const builtin = resolveBuiltinMessageRenderer(templateKind);
        return { component: this.component, presentation: {
            ...builtin,
            roleLabel: this.label === defaultTimelineLabel(this.kind) ? formatAgentUiLabel(this.translator, `agent.timeline.${this.kind}`, this.label) : this.label,
            roleStyle: theme => ({
                ...styleTextToObject(this.tone === 'error' ? theme.statusErrorValue
                    : this.tone === 'attention' ? theme.statusBusyValue
                        : this.tone === 'accent' ? theme.toolsAccent : theme.statusLabel),
                ...(this.tone === 'muted' ? {} : { 'font-weight': 'bold' })
            }),
            itemStyle: (theme, selected) => ({ ...builtin.itemStyle(theme, selected), margin: '0' })
        } };
    }
}

@Injectable()
export class AgentConsoleThoughtMessageRenderer extends AgentConsoleKindRenderer {
    readonly kind = 'thought' as const;
    readonly label = 'Thought · ';
    readonly component = AgentConsoleThoughtTemplate;
}

@Injectable()
export class AgentConsoleToolMessageRenderer extends AgentConsoleKindRenderer {
    readonly kind = 'tool' as const;
    readonly label = 'Tool · ';
    readonly component = AgentConsoleToolTemplate;
}

@Injectable()
export class AgentConsoleCommandMessageRenderer extends AgentConsoleKindRenderer {
    readonly kind = 'command' as const;
    readonly label = '$ ';
    readonly component = AgentConsoleCommandTemplate;
}

@Injectable()
export class AgentConsolePlanMessageRenderer extends AgentConsoleKindRenderer {
    readonly kind = 'plan' as const;
    readonly label = 'Plan · ';
    readonly component = AgentConsolePlanTemplate;
    override readonly tone = 'accent' as const;
}

@Injectable()
export class AgentConsoleFilesMessageRenderer extends AgentConsoleKindRenderer {
    readonly kind = 'file-change' as const;
    readonly label = 'Files · ';
    readonly component = AgentConsoleFilesTemplate;
    override readonly tone = 'accent' as const;
}

@Injectable()
export class AgentConsoleQuestionMessageRenderer extends AgentConsoleKindRenderer {
    readonly kind = 'question' as const;
    readonly label = 'Question · ';
    readonly component = AgentConsoleQuestionTemplate;
    override readonly tone = 'attention' as const;
}

@Injectable()
export class AgentConsoleApprovalMessageRenderer extends AgentConsoleKindRenderer {
    readonly kind = 'approval' as const;
    readonly label = 'Approval · ';
    readonly component = AgentConsoleApprovalTemplate;
    override readonly tone = 'attention' as const;
}

@Injectable()
export class AgentConsoleErrorMessageRenderer extends AgentConsoleKindRenderer {
    readonly kind = 'error' as const;
    readonly label = 'Error · ';
    readonly component = AgentConsoleErrorTemplate;
    override readonly tone = 'error' as const;
}

@Injectable()
export class AgentConsoleDiagnosticMessageRenderer extends AgentConsoleFamilyMessageRenderer {
    constructor(@Optional() @Inject(TranslatorService) private translator?: TranslatorService) { super(); }

    resolve(message: AgentMessage, templateKind: AgentConsoleMessageTemplateKind): AgentConsoleMessageRenderResponse {
        const builtin = resolveBuiltinMessageRenderer(templateKind);
        const metadata = message.metadata || {};
        const kind = presentAgentConsoleSessionContent(message).kind;
        const text = (kind: string, fallback: string) => formatAgentUiLabel(this.translator, `agent.timeline.${kind}`, fallback);
        const labels: Partial<Record<AgentConsoleContentKind, string>> = {
            error: text('error', 'Error · '), warning: text('warning', 'Warning · '), cancelled: text('cancelled', 'Cancelled · '),
            system: text('system', 'System · '), event: text('event', 'Event · ')
        };
        return { component: kind === 'error' || kind === 'warning' ? AgentConsoleErrorTemplate : AgentConsoleSystemTemplate, presentation: {
            ...builtin,
            roleLabel: metadata.backgroundSummary === true ? 'Background · ' : labels[kind] || 'Diagnostic · ',
            roleStyle: theme => styleTextToObject(
                kind === 'error' ? theme.statusErrorValue
                    : kind === 'warning' ? theme.statusBusyValue : theme.statusLabel
            ),
            itemStyle: (theme, selected) => ({
                ...builtin.itemStyle(theme, selected),
                margin: '0.35em 0'
            })
        } };
    }
}

@Injectable()
export class AgentConsoleAttachmentRenderer extends AgentConsoleFamilyMessageRenderer {}

function resolvePlanTodoStatusMark(status: string): string {
    switch (status) {
        case 'completed':
            return 'x';
        case 'cancelled':
            return '-';
        case 'in_progress':
            return '>';
        case 'failed':
            return '✗';
        case 'blocked':
            return '⏸';
        default:
            return ' ';
    }
}

export function resolvePlanTodoContent(message: AgentMessage, compact = false): string {
    const items = Array.isArray(message.metadata?.planItems) ? message.metadata.planItems : [];
    if (!items.length) {
        return String(message.content || '').trim();
    }
    if (compact) {
        const active = items.find((item: any) => item.status === 'in_progress')
            || items.find((item: any) => item.status === 'pending');
        if (!active) {
            const completed = items.filter((item: any) => item.status === 'completed').length;
            return `plan ${items.length} · ${completed}/${items.length} completed`;
        }
        const activeIndex = items.indexOf(active);
        return `plan ${items.length} · current ${activeIndex + 1}. [${resolvePlanTodoStatusMark(active.status)}] ${active.content}`;
    }
    return items.map((item: any, index: number) => {
        const status = item.status === 'pending' && Array.isArray(item.blockedBy) && item.blockedBy.length
            ? 'blocked'
            : item.status;
        const reason = status === 'failed' && item.error
            ? ` · failed: ${item.error}`
            : status === 'blocked' && (item.blockedReason || item.blockedBy?.length)
                ? ` · blocked: ${item.blockedReason || item.blockedBy.join(', ')}`
                : '';
        return `${index + 1}. [${resolvePlanTodoStatusMark(status)}] ${item.content}${reason}`;
    }).join('\n');
}

const agentConsoleMessageRenderers: AgentConsoleResolvedMessageRenderer[] = [
    {
        templateKind: 'error',
        roleLabel: resolveMessageRoleLabel('error'),
        roleStyle: theme => resolveMessageRoleStyle(theme, 'error'),
        itemStyle: (theme, rowSelected) => resolveMessageRowStyle(theme, rowSelected, theme.messagesShell, 'error'),
        lead: () => '',
        continuationLead: () => ''
    },
    {
        templateKind: 'tool',
        roleLabel: resolveMessageRoleLabel('tool'),
        roleStyle: theme => resolveMessageRoleStyle(theme, 'tool'),
        itemStyle: (theme, rowSelected) => resolveMessageRowStyle(theme, rowSelected, theme.messagesShell, 'tool'),
        lead: () => '',
        continuationLead: () => ''
    },
    {
        templateKind: 'assistant',
        roleLabel: resolveMessageRoleLabel('assistant'),
        roleStyle: theme => resolveMessageRoleStyle(theme, 'assistant'),
        itemStyle: (theme, rowSelected) => resolveMessageRowStyle(theme, rowSelected, theme.messagesShell, 'assistant'),
        lead: () => '',
        continuationLead: () => ''
    },
    {
        templateKind: 'user',
        roleLabel: resolveMessageRoleLabel('user'),
        roleStyle: theme => resolveMessageRoleStyle(theme, 'user'),
        itemStyle: (theme, rowSelected) => resolveMessageRowStyle(theme, rowSelected, theme.messagesUser, 'user'),
        lead: () => '',
        continuationLead: () => ''
    },
    {
        templateKind: 'planTodo',
        roleLabel: '◈ ',
        roleStyle: theme => ({
            ...styleTextToObject(theme.toolsAccent),
            'font-weight': 'bold'
        }),
        itemStyle: (theme, rowSelected) => ({
            ...resolveMessageRowStyle(theme, rowSelected, theme.messagesShell, 'system'),
            borderLeft: `3px solid ${rowSelected ? 'transparent' : '#58a6ff'}`,
            background: rowSelected ? '' : 'rgba(88, 166, 255, 0.05)'
        }),
        lead: () => '',
        continuationLead: () => '  '
    },
    {
        templateKind: 'fileChange',
        roleLabel: 'Δ ',
        roleStyle: theme => styleTextToObject(theme.toolsAccent),
        itemStyle: (theme, rowSelected) => resolveMessageRowStyle(theme, rowSelected, theme.messagesShell, 'system'),
        lead: () => '',
        continuationLead: () => '  '
    },
    {
        templateKind: 'timelineBoundary',
        roleLabel: '├ ',
        roleStyle: theme => ({
            ...styleTextToObject(theme.toolsAccent),
            'font-weight': 'bold'
        }),
        itemStyle: (theme, rowSelected) => ({
            ...resolveMessageRowStyle(theme, rowSelected, theme.messagesShell, 'system'),
            'font-weight': 'bold',
            margin: '0'
        }),
        lead: () => '',
        continuationLead: () => ''
    },
    {
        templateKind: 'timelineHeader',
        roleLabel: '┌ ',
        roleStyle: theme => styleTextToObject(theme.statusTitle),
        itemStyle: (theme, rowSelected) => ({
            ...resolveMessageRowStyle(theme, rowSelected, theme.messagesShell, 'system'),
            margin: '0'
        }),
        lead: () => '',
        continuationLead: () => ''
    },
    {
        templateKind: 'timelineFooter',
        roleLabel: '└ ',
        roleStyle: theme => styleTextToObject(theme.statusTitle),
        itemStyle: (theme, rowSelected) => ({
            ...resolveMessageRowStyle(theme, rowSelected, theme.messagesShell, 'system'),
            margin: '0'
        }),
        lead: () => '',
        continuationLead: () => ''
    },
    {
        templateKind: 'timelineCollapsed',
        roleLabel: '⋮ ',
        roleStyle: theme => styleTextToObject(theme.statusTitle),
        itemStyle: (theme, rowSelected) => ({
            ...resolveMessageRowStyle(theme, rowSelected, theme.messagesShell, 'system'),
            margin: '0'
        }),
        lead: () => '',
        continuationLead: () => ''
    },
    {
        templateKind: 'system',
        roleLabel: resolveMessageRoleLabel('system'),
        roleStyle: theme => resolveMessageRoleStyle(theme, 'system'),
        itemStyle: (theme, rowSelected) => resolveMessageRowStyle(theme, rowSelected, theme.messagesShell, 'system'),
        lead: () => '',
        continuationLead: () => ''
    }
];

export function renderAgentConsoleMessageItems(
    messages: AgentMessage[],
    context: AgentConsoleMessageRenderContext = {}
): AgentConsoleRenderedMessageItem[] {
    const source = deriveTimelineDurations(messages || []);
    return source.map((message, index) => {
        const item = renderAgentConsoleMessageItem(message, context);
        const previous = index > 0 ? presentAgentConsoleSessionContent(source[index - 1]) : undefined;
        if (previous?.kind === 'user' && item.semanticKind !== 'user') {
            item.spacerBefore = true;
            item.blockPadding = true;
        }
        return item;
    });
}

export function renderAgentConsoleMessageItem(
    message: AgentMessage,
    context: AgentConsoleMessageRenderContext = {}
): AgentConsoleRenderedMessageItem {
    const theme = context.theme || defaultAgentConsoleTheme;
    const presentation = presentAgentConsoleSessionContent(message);
    const templateKind = resolveMessageTemplateKind(message);
    const response = context.rendererRegistry?.resolve(message, templateKind) || {
        presentation: resolveBuiltinMessageRenderer(templateKind),
        component: AgentConsoleSystemTemplate
    };
    const renderer = response.presentation;
    const selected = message?.id === context.selectedMessageId;
    const rowSelected = !!(selected && context.messagesFocused);
    const baseItemStyle = renderer.itemStyle(theme, rowSelected);
    const baseRoleLabel = presentation.kind === 'assistant-final' && templateKind === 'assistant'
        ? ''
        : context.rendererRegistry
            ? renderer.roleLabel
            : resolveAgentConsoleMessageRoleLabel(message, renderer.roleLabel);
    const roleLabel = context.showUsername
        ? `${baseRoleLabel}${templateKind === 'user' ? String(context.username || 'you') : 'agent'}:`
        : baseRoleLabel;
    const timelineEvent = message?.metadata?.uiKind === 'event';
    const timelineEventType = String(message?.metadata?.uiEventType || '').trim();
    const criticalMark = context.showCriticalMarks ? '★ ' : '';
    const effectiveRoleLabel = resolveEffectiveRoleLabel(
        timelineEvent, presentation.kind, roleLabel, criticalMark, !!context.rendererRegistry);
    const statusKind = resolveAgentConsoleMessageStatus(message, templateKind);
    const actionLabel = timelineEvent ? resolveTimelineEventActionLabel(message, statusKind, context.translator) : '';
    const itemStyle = timelineEvent
        ? resolveTimelineEventItemStyle(theme, baseItemStyle, statusKind, rowSelected)
        : baseItemStyle;
    const inlineRowStyle = resolveInlineRowStyle(itemStyle);
    const statusLabel = resolveAgentConsoleMessageStatusLabel(statusKind, context.statusLabels);
    // Opencode renders assistant prose (final answer included) without a glyph; steps keep theirs.
    const statusSymbol = context.statusSymbol || ((timelineEvent || (context.timelineMode && templateKind !== 'assistant') || message?.metadata?.uiKind === 'command-execution') ? resolveDefaultStatusGlyph(statusKind) : '');
    // Opencode uses a compact +/− disclosure marker for reasoning rows; the
    // running state keeps the live dot.
    const thoughtSymbol = presentation.kind === 'thought' ? (statusKind === 'running' ? '●' : '+') : statusSymbol;
    const status = formatAgentConsoleMessageStatus(statusKind, thoughtSymbol);
    // Settled thoughts are chrome: keep the disclosure marker muted so it does not compete with live steps.
    const statusStyle = presentation.kind === 'thought' && statusKind !== 'running'
        ? styleTextToObject(theme.statusLabel)
        : resolveAgentConsoleMessageStatusStyle(theme, statusKind, rowSelected);
    const hideToolOutput = templateKind === 'tool' && context.showToolOutput === false;
    const rawDisplayContent = hideToolOutput
        ? ''
        : resolveMessageDisplayContent(message, templateKind, !!context.rawMode);
    // Tool-result markers (`<path> (truncated)`) are written by the runtime before the locale is known.
    const rowDisplayContent = (timelineEvent || templateKind === 'tool') ? localizeTimelineContentSuffix(rawDisplayContent, context.translator) : rawDisplayContent;
    const displayContent = message?.metadata?.uiKind === 'command-execution' ? localizeCommandExecutionStatus(rowDisplayContent, context.translator) : rowDisplayContent;
    const timelineSentence = timelineEvent
        ? resolveTimelineEventSentence(message?.metadata, displayContent, context.timelineLabels)
        : undefined;
    // Content stays the primary row text (P237 truncation/expansion contract;
    // long rows also keep the detail toggle); the sentence only fills empty
    // content events like model_completed.
    // The event bridge/gateway writes boilerplate English turn lifecycle rows;
    // localize them at render time so a resumed session follows the current
    // locale. Custom reasons (`Stopped by user`) stay verbatim.
    const lifecycleLabel = timelineEvent ? resolveTurnLifecycleLabel(displayContent, context.timelineLabels) : '';
    const eventText = lifecycleLabel || displayContent || timelineSentence || '';
    const eventRowContent = timelineEvent
        ? (context.messageDetailOpen && selected
            ? eventText
            : truncateTimelineEventRowContent(eventText, statusKind, timelineEventType))
        : displayContent;
    const messageStreaming = templateKind === 'assistant' && !!(message?.metadata?.streaming);
    const streaming = messageStreaming || !!context.streaming;
    // opencode insets assistant prose by three columns (paddingLeft={3});
    // item padding already contributes one column, so add two here.
    const bodyIndent = !timelineEvent
        && templateKind === 'assistant'
        && (presentation.kind === 'assistant-final' || presentation.kind === 'assistant-partial')
        ? '  '
        : '';
    const markdownWidth = context.markdownContentWidth
        ? Math.max(24, context.markdownContentWidth - bodyIndent.length)
        : context.markdownContentWidth;
    const markdownLines = hideToolOutput
        ? []
        : context.rawMode || templateKind === 'planTodo'
            || templateKind === 'timelineHeader' || templateKind === 'timelineFooter'
            || templateKind === 'timelineCollapsed'
            ? renderAgentConsolePlainTextLines(eventRowContent, { compactBlankLines: false })
            : streaming || templateKind === 'user'
                ? streaming
                    ? resolveMarkdownLines(eventRowContent, { compactBlankLines: true, treatUnclosedFenceAsText: true, tableWidth: markdownWidth }, context.markdownBridge)
                    : renderAgentConsolePlainTextLines(eventRowContent, { compactBlankLines: true })
                : resolveMarkdownLines(eventRowContent, { compactBlankLines: !timelineEvent, tableWidth: markdownWidth }, context.markdownBridge);
    const timelineMeta = resolveTimelineMeta(message, templateKind, statusLabel, !!context.showTimestamps, context.translator);
    const metaDurationSuffix = timelineMeta.match(/ \([^()]+\)$/)?.[0] || '';
    // Step boundaries own their duration in meta; event rows keep it as a
    // trailing muted token at the end of the row (P302 vs P237/row-end).
    const durationStaysInMeta = templateKind === 'timelineBoundary';
    const timelineDetails = !durationStaysInMeta && metaDurationSuffix
        ? timelineMeta.slice(0, -metaDurationSuffix.length)
        : timelineMeta;
    // Final replies render the worked/done summary as a dedicated footer line
    // instead of gluing it onto the last body line; that footer already carries
    // the duration, so no trailing token is appended for them.
    const workedSummary = templateKind === 'assistant' && shouldRenderWorkedSummary(message);
    const metaText = timelineDetails ? `${timelineDetails} ` : '';
    const tokenDurationSuffix = durationStaysInMeta ? '' : metaDurationSuffix;
    const fallbackLine = templateKind === 'assistant'
            ? { rawText: '', tokens: [{ text: '…' }] as AgentConsoleMarkdownToken[] }
            : { rawText: '', tokens: [] as AgentConsoleMarkdownToken[] };
    const sourceLines = markdownLines.length ? markdownLines : [fallbackLine as AgentConsoleMarkdownLine];
    const detailLimit = Math.max(1, Math.floor(context.messageDetailVisibleLines || 6));
    // The expand/collapse affordance is UI copy; the row body stays verbatim.
    const detailToggle = resolveTimelineDetailToggle(
        timelineEvent, selected, !!context.messageDetailOpen,
        Math.max(sourceLines.length, String(displayContent).split('\n').length, String(message?.content || '').split('\n').length),
        detailLimit, context.translator);
    const timelineMetaStyle = resolveTimelineMetaStyle(theme, rowSelected, templateKind);
    const lines: AgentConsoleRenderedLine[] = sourceLines.map((line, index) => {
        const isFirst = index === 0;
        const isLast = index === sourceLines.length - 1;
        const blankLine = isAgentConsoleBlankMarkdownLine(line);
        const rendered = buildRenderedLine(
            { ...line, tokens: line.tokens || [] },
            isFirst ? renderer.lead(rowSelected) : renderer.continuationLead(rowSelected),
            effectiveRoleLabel,
            renderer,
            theme,
            rowSelected,
            templateKind,
            inlineRowStyle,
            isFirst ? status : formatAgentConsoleMessageStatus(undefined, context.statusSymbol),
            statusKind,
            statusLabel,
            isFirst ? statusStyle : rowSelected ? {} : inlineRowStyle
        );
        const tokens = isLast && (actionLabel || tokenDurationSuffix)
            ? [
                ...rendered.tokens,
                ...(actionLabel ? [{ text: ` · ${actionLabel}`, tone: 'muted' as const, style: timelineMetaStyle }] : []),
                ...(tokenDurationSuffix ? [{ text: tokenDurationSuffix, tone: 'muted' as const, style: timelineMetaStyle }] : [])
            ]
            : rendered.tokens;
        const continuationIndent = rendered.continuationIndent ? rendered.continuationIndent + bodyIndent.length : 0;
        return {
            ...rendered,
            tokens,
            prefix: bodyIndent ? `${bodyIndent}${rendered.prefix || ''}` : rendered.prefix,
            continuationIndent: continuationIndent || undefined,
            messageId: message?.id,
            toggleContent: blankLine ? '' : isFirst ? detailToggle : '',
            role: blankLine ? '' : isFirst ? rendered.role : rendered.role ? '    ' : '',
            roleStyle: blankLine || !isFirst ? {} : rendered.roleStyle,
            meta: blankLine ? '' : workedSummary ? '' : (isFirst ? metaText : ''),
            metaStyle: blankLine ? {} : workedSummary ? {} : (isFirst || isLast ? timelineMetaStyle : {}),
            ariaLabel: blankLine ? '' : [
                isFirst ? presentation.title : '',
                isFirst && String(timelineMeta || '').split(' · ').includes(String(rendered.statusLabel || '')) ? '' : isFirst ? rendered.statusLabel : '',
                isLast && !workedSummary ? timelineMeta : '',
                isLast ? actionLabel : '',
                rendered.prefix,
                rendered.content
            ].filter(part => String(part || '').trim()).join(' ').replace(/\s+/g, ' ').trim(),
            itemStyle: resolveAgentConsoleLineItemStyle(
                itemStyle,
                resolveSemanticLinePadding(presentation, isFirst, isLast, timelineEvent),
                resolveSemanticLineMargin(presentation, isFirst, timelineEvent, String(itemStyle.margin || '0')),
                blankLine,
                continuationIndent
            ),
            lineStyle: {
                ...(rendered.lineStyle || {}),
                ...resolveRenderedLineToneStyle(theme, rendered, rowSelected, templateKind, timelineEvent)
            },
            semanticFamily: presentation.family,
            semanticKind: presentation.kind
        };
    });
    if (workedSummary) {
        const base = lines[lines.length - 1];
        lines.push({
            ...base,
            status: '',
            statusStyle: {},
            role: '',
            roleStyle: {},
            prefix: '',
            tokens: [],
            toggleContent: '',
            meta: metaText,
            metaStyle: timelineMetaStyle,
            ariaLabel: timelineMeta,
            itemStyle: { ...base.itemStyle },
            lineStyle: { ...(base.lineStyle || {}) }
        });
    }
    const mentionFiles = templateKind === 'user' && Array.isArray(message?.metadata?.mentionFiles)
        ? (message!.metadata!.mentionFiles as unknown[]).map(value => String(value)).filter(Boolean)
        : [];
    if (mentionFiles.length) {
        const base = lines[lines.length - 1];
        lines.push({
            ...base,
            status: '',
            statusStyle: {},
            role: '',
            roleStyle: {},
            prefix: '',
            toggleContent: '',
            tokens: [{ text: `Files · ${mentionFiles.join(', ')}`, tone: 'muted' as const, style: timelineMetaStyle }],
            meta: '',
            metaStyle: {},
            ariaLabel: `Files ${mentionFiles.join(', ')}`,
            itemStyle: { ...base.itemStyle },
            lineStyle: { ...(base.lineStyle || {}) }
        });
    }
    return {
        [noReact]: true,
        kind: roleLabel,
        templateKind,
        selected,
        statusKind,
        statusLabel,
        status,
        statusStyle,
        itemStyle,
        component: response.component,
        lines,
        semanticFamily: presentation.family,
        semanticKind: presentation.kind,
        spacerBefore: !timelineEvent && presentation.kind === 'assistant-final',
        blockPadding: !timelineEvent
            && (presentation.kind === 'user' || presentation.kind === 'assistant-final')
    };
}

function resolveMarkdownLines(
    content: string,
    options: import('./AgentConsoleMarkdown').AgentConsoleMarkdownRenderOptions,
    bridge?: MarkdownWorkerBridge
): AgentConsoleMarkdownLine[] {
    if (bridge) {
        return bridge.render(content, options);
    }
    return renderAgentConsoleMarkdownLines(content, options);
}


export function resolveMessageTemplateKind(message?: AgentMessage | null): AgentConsoleMessageTemplateKind {
    // Plan todo messages are synthesized by the session state and rendered
    // inline in the conversation flow with a distinct visual treatment.
    if (message?.metadata?.uiKind === 'plan-todo') {
        return 'planTodo';
    }
    if (message?.metadata?.uiKind === 'file-change') {
        return 'fileChange';
    }
    if (message?.metadata?.uiKind === 'timeline-boundary') {
        return 'timelineBoundary';
    }
    if (message?.metadata?.uiKind === 'timeline-header') {
        return 'timelineHeader';
    }
    if (message?.metadata?.uiKind === 'timeline-footer') {
        return 'timelineFooter';
    }
    if (message?.metadata?.uiKind === 'timeline-collapsed') {
        return 'timelineCollapsed';
    }
    // Shell messages stay in the 'tool' template even on failure; their
    // failed/error state is carried by the status, not by the template.
    if (message?.metadata?.error && message?.metadata?.type !== 'shell') {
        return 'error';
    }
    switch (String(message?.role || '').toLowerCase()) {
        case 'user':
            return 'user';
        case 'assistant':
            return 'assistant';
        case 'tool':
            return 'tool';
        default:
            return 'system';
    }
}

export function resolveAgentConsoleMessageStatus(
    message?: AgentMessage | null,
    templateKind: AgentConsoleMessageTemplateKind = resolveMessageTemplateKind(message)
): AgentConsoleMessageStatus | undefined {
    if (!message || templateKind === 'user' || templateKind === 'timelineHeader'
        || templateKind === 'timelineFooter' || templateKind === 'timelineCollapsed') {
        return undefined;
    }
    if (message?.metadata?.uiKind === 'plan-todo') {
        const items: any[] = Array.isArray(message.metadata.planItems) ? message.metadata.planItems : [];
        if (!items.some(item => item.status === 'pending' || item.status === 'in_progress')) return 'success';
        return message.metadata.planLive === false ? undefined : 'running';
    }
    if (message?.metadata?.uiKind === 'command-execution') {
        // A running/failed slash command must show ● / ✕, not the default ✓.
        const status = String(message.metadata.status || '').trim();
        return status === 'running' ? 'running' : status === 'failed' || status === 'error' ? 'failed' : 'success';
    }
    if (message?.metadata?.uiKind === 'event') {
        const eventType = String(message.metadata.uiEventType || '').trim();
        // P292: the remote bridge reports plan_step_blocked with status
        // 'running' (the step id is in the content); the event type is the
        // authoritative state so the row shows ⊘ 阻塞 instead of a running ●.
        // Same for a failed step that arrives without an explicit error status.
        if (eventType === 'plan_step_blocked') return 'blocked';
        if (eventType === 'plan_step_failed') return 'failed';
        const status = String(message.metadata.status || '').trim();
        if (status === 'running' || status === 'success' || status === 'failed' || status === 'error' || status === 'blocked') return status as AgentConsoleMessageStatus;
    }
    if (message?.metadata?.streaming) {
        return 'running';
    }
    if (String(message.role || '').toLowerCase() === 'tool' && message?.metadata?.error) {
        return 'failed';
    }
    if (templateKind === 'timelineBoundary') {
        // P302: the step boundary shows the active step's own state as its
        // glyph — the boundary is a state point, not a static divider.
        switch (String(message?.metadata?.planStepStatus || '').trim()) {
            case 'in_progress':
            case 'pending':
                return 'running';
            case 'failed':
                return 'failed';
            default:
                return 'success';
        }
    }
    if (templateKind === 'error') {
        return 'error';
    }
    return 'success';
}

export function resolveAgentConsoleMessageStatusLabel(
    status?: AgentConsoleMessageStatus,
    labels?: AgentConsoleMessageStatusLabels
): string {
    switch (status) {
        case 'running':
            return labels?.running || '正在执行';
        case 'failed':
            return labels?.failed || '失败';
        case 'error':
            return labels?.error || '错误';
        case 'blocked':
            return labels?.blocked || '阻塞';
        case 'success':
            return labels?.success || '成功';
        default:
            return '';
    }
}

function resolveBuiltinMessageRenderer(templateKind: AgentConsoleMessageTemplateKind): AgentConsoleResolvedMessageRenderer {
    return agentConsoleMessageRenderers.find(renderer => renderer.templateKind === templateKind)
        || agentConsoleMessageRenderers[agentConsoleMessageRenderers.length - 1];
}


function resolveMessageDisplayContent(
    message: AgentMessage,
    templateKind: AgentConsoleMessageTemplateKind,
    rawMode = false
): string {
    let content = String(message?.content || '');
    if (templateKind === 'user') {
        content = stripMentionContextBlock(content);
    }
    if (templateKind === 'planTodo') {
        return content.trim() ? content : resolvePlanTodoContent(message);
    }
    const imageParts = getAgentMessageImageParts(message);
    const attachmentSummary = imageParts.length
        ? imageParts.map(part => part.name ? `[Image: ${part.name}]` : '[Image attached]').join('\n')
        : '';
    if (message?.metadata?.type === 'shell') {
        return [content, attachmentSummary].filter(Boolean).join(content && attachmentSummary ? '\n' : '');
    }
    if (templateKind !== 'tool' || rawMode) {
        return [content, attachmentSummary].filter(Boolean).join(content && attachmentSummary ? '\n' : '');
    }
    const toolName = String(message?.metadata?.receipt?.toolName || message?.name || '').trim();
    return summarizeToolDisplayText(toolName, content, 'output') || content;
}

function resolveMessageRowStyle(
    theme: AgentConsoleTheme,
    rowSelected: boolean,
    baseStyleText: string,
    templateKind: AgentConsoleMessageTemplateKind
): Record<string, string> {
    const rowStyleText = rowSelected
        ? theme.messagesSelected
        : templateKind === 'user'
            ? baseStyleText
            : '';
    return {
        padding: '0.6em 1ch',
        display: 'block',
        'box-sizing': 'border-box',
        'white-space': 'normal',
        'overflow-wrap': 'anywhere',
        margin: '0 0 0.25em 0',
        ...(rowStyleText ? styleTextToObject(rowStyleText) : {})
    };
}

function buildRenderedLine(
    line: AgentConsoleMarkdownLine,
    roleLead: string,
    roleLabel: string,
    renderer: AgentConsoleResolvedMessageRenderer,
    theme: AgentConsoleTheme,
    rowSelected: boolean,
    templateKind: AgentConsoleMessageTemplateKind,
    inlineRowStyle: AgentConsoleInlineRowStyle,
    status: string,
    statusKind: AgentConsoleMessageStatus | undefined,
    statusLabel: string,
    statusStyle: Record<string, string>
): AgentConsoleRenderedLine {
    const lineStyle = {
        ...inlineRowStyle,
        'white-space': 'normal',
        'overflow-wrap': 'anywhere'
    };
    const defaultTokenStyle = rowSelected
        ? {}
        : resolveAgentConsoleMarkdownToneStyle(line.tone || 'default', theme, templateKind);
    const tokens = (line.tokens || [])
        .filter(token => token && token.text)
        .map(token => ({
            ...token,
            style: rowSelected
                ? {}
                : {
                    ...defaultTokenStyle,
                    ...resolveAgentConsoleMarkdownToneStyle(token.tone || line.tone || 'default', theme, templateKind)
                }
        }));
    return {
        statusKind,
        statusLabel,
        status,
        statusStyle,
        role: roleLead ? `${roleLead}${roleLabel}` : roleLabel,
        roleStyle: rowSelected ? {} : { ...inlineRowStyle, ...renderer.roleStyle(theme) },
        meta: '',
        metaStyle: {},
        prefix: line.prefix || '',
        prefixStyle: {
            ...inlineRowStyle,
            ...resolveAgentConsoleMarkdownPrefixStyle(line, theme, rowSelected)
        },
        content: tokens.map(token => token.text).join(''),
        tokens,
        lineStyle,
        continuationIndent: line.continuationIndent,
        tone: line.tone
    };
}

function deriveTimelineDurations(messages: AgentMessage[]): AgentMessage[] {
    let turnStartedAt = NaN;
    return messages.map(message => {
        const createdAt = Number(message?.createdAt);
        if (String(message?.role || '').toLowerCase() === 'user') {
            if (Number.isFinite(createdAt)) turnStartedAt = createdAt;
            return message;
        }
        const presentation = presentAgentConsoleSessionContent(message);
        if (presentation.kind !== 'assistant-final' || Number.isFinite(resolveMessageDurationMs(message))
            || !Number.isFinite(turnStartedAt) || !Number.isFinite(createdAt) || createdAt < turnStartedAt) {
            return message;
        }
        return { ...message, metadata: { ...(message.metadata || {}), durationMs: createdAt - turnStartedAt } };
    });
}

export const TIMELINE_EVENT_ROW_CONTENT_MAX = 200;

// Long stdout/diff bodies belong to the event inspector; rows keep a bounded
// summary. CJK/emoji count as 2 columns so the row stays within a stable
// display width. Failed/error rows stay expanded by default so the cause is
// visible; plan-step failed/blocked rows stay expanded by event type because
// the bridge pins their status to 'running' (P237/P292).
export function truncateTimelineEventRowContent(
    content: string,
    statusKind?: AgentConsoleMessageStatus,
    eventType = ''
): string {
    const text = String(content || '')
        .replace(/\r/g, '')
        .split('\n')
        .map(line => line.trim())
        .find(line => line && !/^(?:\d+\.|[-*+•◦▪])$/.test(line)) || '';
    if (getDisplayWidth(text) <= TIMELINE_EVENT_ROW_CONTENT_MAX) {
        return text;
    }
    return `${sliceByDisplayWidth(text, TIMELINE_EVENT_ROW_CONTENT_MAX).replace(/\s+$/, '')}…`;
}

export function resolveTimelineEventActionLabel(message?: AgentMessage | null,
    statusKind?: AgentConsoleMessageStatus, translator?: AgentUiTranslator | null): string {
    const metadata = message?.metadata || {};
    if (metadata.uiKind !== 'event') {
        return '';
    }
    const eventType = String(metadata.uiEventType || '').trim();
    const failed = statusKind === 'failed' || statusKind === 'error';
    if ((eventType.startsWith('tool_') || eventType === 'tool_call') && failed) {
        return formatAgentUiLabel(translator, 'agent.timeline.actionRetry', '重试');
    }
    if (eventType.startsWith('plan_step_') && (failed || statusKind === 'blocked'
        || eventType === 'plan_step_blocked' || String(metadata.status || '') === 'blocked')) {
        return formatAgentUiLabel(translator, 'agent.timeline.actionRetry', '重试');
    }
    if (eventType === 'approval' || eventType === 'approval_request') {
        return formatAgentUiLabel(translator, 'agent.timeline.actionReview', '审批');
    }
    return '';
}

// Timeline status glyphs — the single visual state point of an event row
// (P289). running ● / success ✓ / failed|error ✕ / blocked ⊘.
function resolveDefaultStatusGlyph(status?: AgentConsoleMessageStatus): string {
    switch (status) {
        case 'running':
            return '●';
        case 'success':
            return '✓';
        case 'failed':
        case 'error':
            return '✕';
        case 'blocked':
            return '⊘';
        default:
            return '';
    }
}

function resolveRenderedLineToneStyle(
    theme: AgentConsoleTheme,
    line: AgentConsoleRenderedLine,
    rowSelected: boolean,
    templateKind: AgentConsoleMessageTemplateKind,
    timelineEvent = false
): Record<string, string> {
    if (rowSelected) {
        return {};
    }
    const tone = resolveRenderedLineTone(line);
    if (!timelineEvent || tone !== 'default') {
        return resolveAgentConsoleMarkdownToneStyle(tone, theme, templateKind);
    }
    switch (line.statusKind) {
        case 'success':
            return styleTextToObject(theme.statusLabel);
        case 'failed':
        case 'error':
            return styleTextToObject(theme.statusErrorValue);
        case 'blocked':
            return styleTextToObject(theme.statusBusyValue);
        default:
            return styleTextToObject(theme.statusValue);
    }
}

function resolveRenderedLineTone(line: AgentConsoleRenderedLine): AgentConsoleMarkdownTone {
    if (line.tone && line.tone !== 'default') {
        return line.tone;
    }
    const tokenTone = line.tokens.find(token => token.tone && token.tone !== 'default')?.tone;
    return tokenTone || 'default';
}

function resolveInlineRowStyle(style: Record<string, string>): AgentConsoleInlineRowStyle {
    const inlineStyle: AgentConsoleInlineRowStyle = {};
    if (style.color) {
        inlineStyle.color = style.color;
    }
    if (style['font-weight']) {
        inlineStyle['font-weight'] = style['font-weight'];
    }
    return inlineStyle;
}

function resolveTimelineEventItemStyle(
    theme: AgentConsoleTheme,
    style: Record<string, string>,
    status: AgentConsoleMessageStatus | undefined,
    rowSelected: boolean
): Record<string, string> {
    void theme;
    void status;
    void rowSelected;
    return {
        ...style,
        margin: '0'
    };
}

function resolveAgentConsoleMessageStatusStyle(
    theme: AgentConsoleTheme,
    status?: AgentConsoleMessageStatus,
    rowSelected = false
): Record<string, string> {
    if (rowSelected || !status) {
        return {};
    }
    switch (status) {
        case 'running':
            return styleTextToObject(theme.statusBusyValue);
        case 'failed':
        case 'error':
            return styleTextToObject(theme.statusErrorValue);
        case 'blocked':
            return styleTextToObject(theme.statusBusyValue);
        default:
            return styleTextToObject(theme.statusIdleValue);
    }
}

function formatAgentConsoleMessageStatus(status?: AgentConsoleMessageStatus, symbol = ''): string {
    if (!status) {
        return '';
    }
    return symbol ? `${symbol} ` : '';
}
