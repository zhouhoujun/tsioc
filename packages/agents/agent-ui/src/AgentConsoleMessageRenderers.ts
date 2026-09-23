import { AgentMessage, getAgentMessageImageParts, summarizeToolDisplayText } from '@tsdi/agent';
import { Inject, Injectable, Injector, Token, Type, token } from '@tsdi/ioc';
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
import { resolveTimelineEventSentence, formatTimelineSessionDuration, AgentConsoleTimelineLabels } from './AgentConsoleTimelineWindow';
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
    timelineLabels?: AgentConsoleTimelineLabels;
    /** When true, all messages carry the critical mark (★) and render uncollapsed. */
    showCriticalMarks?: boolean;
    /** When provided, long messages (>1000 chars) are routed through the bridge for off-main-thread parsing. */
    markdownBridge?: MarkdownWorkerBridge;
    rendererRegistry?: AgentConsoleMessageRendererRegistry;
    messageDetailOpen?: boolean;
    messageDetailVisibleLines?: number;
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
                'border-left': '2px solid transparent',
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
        return { component: AgentConsoleMarkdownComponent, presentation: { ...response.presentation, roleLabel: 'Context · ' } };
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
    abstract readonly kind: AgentConsoleContentKind;
    abstract readonly label: string;
    abstract readonly rail: string;
    abstract readonly component: Type<any>;
    readonly tone: AgentConsoleKindRendererTone = 'muted';

    resolve(_message: AgentMessage, templateKind: AgentConsoleMessageTemplateKind): AgentConsoleMessageRenderResponse {
        const builtin = resolveBuiltinMessageRenderer(templateKind);
        return { component: this.component, presentation: {
            ...builtin,
            roleLabel: this.label,
            roleStyle: theme => ({
                ...styleTextToObject(this.tone === 'error' ? theme.statusErrorValue
                    : this.tone === 'attention' ? theme.statusBusyValue
                        : this.tone === 'accent' ? theme.toolsAccent : theme.statusLabel),
                ...(this.tone === 'muted' ? {} : { 'font-weight': 'bold' })
            }),
            itemStyle: (theme, selected) => ({
                ...builtin.itemStyle(theme, selected),
                'border-left': selected ? `${this.rail.split(' ')[0]} solid transparent` : this.rail,
                margin: '0'
            })
        } };
    }
}

@Injectable()
export class AgentConsoleThoughtMessageRenderer extends AgentConsoleKindRenderer {
    readonly kind = 'thought' as const;
    readonly label = 'Thought · ';
    readonly rail = '2px solid #6e7681';
    readonly component = AgentConsoleThoughtTemplate;
}

@Injectable()
export class AgentConsoleToolMessageRenderer extends AgentConsoleKindRenderer {
    readonly kind = 'tool' as const;
    readonly label = 'Tool · ';
    readonly rail = '2px solid #6e7681';
    readonly component = AgentConsoleToolTemplate;
}

@Injectable()
export class AgentConsoleCommandMessageRenderer extends AgentConsoleKindRenderer {
    readonly kind = 'command' as const;
    readonly label = '$ ';
    readonly rail = '2px solid #6e7681';
    readonly component = AgentConsoleCommandTemplate;
}

@Injectable()
export class AgentConsolePlanMessageRenderer extends AgentConsoleKindRenderer {
    readonly kind = 'plan' as const;
    readonly label = 'Plan · ';
    readonly rail = '2px solid #79c0ff';
    readonly component = AgentConsolePlanTemplate;
    override readonly tone = 'accent' as const;
}

@Injectable()
export class AgentConsoleFilesMessageRenderer extends AgentConsoleKindRenderer {
    readonly kind = 'file-change' as const;
    readonly label = 'Files · ';
    readonly rail = '2px solid #79c0ff';
    readonly component = AgentConsoleFilesTemplate;
    override readonly tone = 'accent' as const;
}

@Injectable()
export class AgentConsoleQuestionMessageRenderer extends AgentConsoleKindRenderer {
    readonly kind = 'question' as const;
    readonly label = 'Question · ';
    readonly rail = '3px solid #d29922';
    readonly component = AgentConsoleQuestionTemplate;
    override readonly tone = 'attention' as const;
}

@Injectable()
export class AgentConsoleApprovalMessageRenderer extends AgentConsoleKindRenderer {
    readonly kind = 'approval' as const;
    readonly label = 'Approval · ';
    readonly rail = '3px solid #d29922';
    readonly component = AgentConsoleApprovalTemplate;
    override readonly tone = 'attention' as const;
}

@Injectable()
export class AgentConsoleErrorMessageRenderer extends AgentConsoleKindRenderer {
    readonly kind = 'error' as const;
    readonly label = 'Error · ';
    readonly rail = '3px solid #f85149';
    readonly component = AgentConsoleErrorTemplate;
    override readonly tone = 'error' as const;
}

@Injectable()
export class AgentConsoleDiagnosticMessageRenderer extends AgentConsoleFamilyMessageRenderer {
    resolve(message: AgentMessage, templateKind: AgentConsoleMessageTemplateKind): AgentConsoleMessageRenderResponse {
        const builtin = resolveBuiltinMessageRenderer(templateKind);
        const metadata = message.metadata || {};
        const kind = presentAgentConsoleSessionContent(message).kind;
        const labels: Partial<Record<AgentConsoleContentKind, string>> = {
            error: 'Error · ', warning: 'Warning · ', cancelled: 'Cancelled · ', system: 'System · ', event: 'Event · '
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
                'border-left': selected ? '3px solid transparent'
                    : kind === 'error' ? '3px solid #f85149'
                        : kind === 'warning' ? '3px solid #d29922' : '2px solid #6e7681',
                margin: '0.35em 0'
            })
        } };
    }
}

@Injectable()
export class AgentConsoleAttachmentRenderer extends AgentConsoleFamilyMessageRenderer {}

function resolveMessageRoleLabel(templateKind: AgentConsoleMessageTemplateKind): string {
    switch (templateKind) {
        case 'user':
            return '› ';
        case 'assistant':
            return '• ';
        case 'tool':
            return '◦ ';
        case 'error':
            return '! ';
        default:
            return '· ';
    }
}

function resolveMessageRoleStyle(theme: AgentConsoleTheme, templateKind: AgentConsoleMessageTemplateKind): Record<string, string> {
    switch (templateKind) {
        case 'user':
            return styleTextToObject(theme.statusValue);
        case 'assistant':
            return {
                ...styleTextToObject(theme.toolsAccent),
                'font-weight': 'bold'
            };
        case 'tool':
            return styleTextToObject(theme.toolsAccent);
        case 'error':
            return styleTextToObject(theme.statusErrorValue);
        default:
            return styleTextToObject(theme.statusLabel);
    }
}

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
            margin: '0',
            'border-left': resolveTimelineRail(theme, rowSelected, 'accent')
        }),
        lead: () => '',
        continuationLead: () => ''
    },
    {
        templateKind: 'timelineHeader',
        roleLabel: '┌ ',
        roleStyle: theme => ({
            ...styleTextToObject(theme.toolsAccent),
            'font-weight': 'bold'
        }),
        itemStyle: (theme, rowSelected) => ({
            ...resolveMessageRowStyle(theme, rowSelected, theme.messagesShell, 'system'),
            'font-weight': 'bold',
            margin: '0',
            'border-left': resolveTimelineRail(theme, rowSelected, 'muted')
        }),
        lead: () => '',
        continuationLead: () => ''
    },
    {
        templateKind: 'timelineFooter',
        roleLabel: '└ ',
        roleStyle: theme => ({
            ...styleTextToObject(theme.toolsAccent),
            'font-weight': 'bold'
        }),
        itemStyle: (theme, rowSelected) => ({
            ...resolveMessageRowStyle(theme, rowSelected, theme.messagesShell, 'system'),
            'font-weight': 'bold',
            margin: '0',
            'border-left': resolveTimelineRail(theme, rowSelected, 'muted')
        }),
        lead: () => '',
        continuationLead: () => ''
    },
    {
        templateKind: 'timelineCollapsed',
        roleLabel: '⋮ ',
        roleStyle: theme => ({
            ...styleTextToObject(theme.toolsAccent),
            'font-weight': 'bold'
        }),
        itemStyle: (theme, rowSelected) => ({
            ...resolveMessageRowStyle(theme, rowSelected, theme.messagesShell, 'system'),
            'font-weight': 'bold',
            margin: '0',
            'border-left': resolveTimelineRail(theme, rowSelected, 'muted')
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
    const effectiveRoleLabel = timelineEvent
        // Status remains a single glyph column; the semantic renderer supplies
        // the human-readable content type (Thought/Tool/Background/etc.).
        ? `│ ${criticalMark}${context.rendererRegistry ? roleLabel : ''}`
        : `${criticalMark}${roleLabel}`;
    const statusKind = resolveAgentConsoleMessageStatus(message, templateKind);
    const itemStyle = timelineEvent
        ? resolveTimelineEventItemStyle(theme, baseItemStyle, statusKind, rowSelected)
        : baseItemStyle;
    const inlineRowStyle = resolveInlineRowStyle(itemStyle);
    const statusLabel = resolveAgentConsoleMessageStatusLabel(statusKind, context.statusLabels);
    const statusSymbol = context.statusSymbol
        || ((timelineEvent || context.timelineMode) ? resolveDefaultStatusGlyph(statusKind) : '');
    const status = formatAgentConsoleMessageStatus(statusKind, statusSymbol);
    const statusStyle = resolveAgentConsoleMessageStatusStyle(theme, statusKind, rowSelected);
    const hideToolOutput = templateKind === 'tool' && context.showToolOutput === false;
    const displayContent = hideToolOutput
        ? ''
        : resolveMessageDisplayContent(message, templateKind, !!context.rawMode);
    const timelineSentence = timelineEvent
        ? resolveTimelineEventSentence(message?.metadata, displayContent, context.timelineLabels)
        : undefined;
    // Content stays the primary row text (P237 truncation/expansion contract;
    // long rows also keep the detail toggle); the sentence only fills empty
    // content events like model_completed.
    const eventRowContent = timelineEvent
        ? (context.messageDetailOpen && selected
            ? (displayContent || timelineSentence || '')
            : truncateTimelineEventRowContent(displayContent || timelineSentence || '', statusKind, timelineEventType))
        : displayContent;
    const messageStreaming = templateKind === 'assistant' && !!(message?.metadata?.streaming);
    const streaming = messageStreaming || !!context.streaming;
    const markdownLines = hideToolOutput
        ? []
        : context.rawMode || templateKind === 'planTodo'
            || templateKind === 'timelineHeader' || templateKind === 'timelineFooter'
            || templateKind === 'timelineCollapsed'
            ? renderAgentConsolePlainTextLines(eventRowContent, { compactBlankLines: false })
            : streaming || templateKind === 'user'
                ? streaming
                    ? resolveMarkdownLines(eventRowContent, { compactBlankLines: true, treatUnclosedFenceAsText: true }, context.markdownBridge)
                    : renderAgentConsolePlainTextLines(eventRowContent, { compactBlankLines: true })
                : resolveMarkdownLines(eventRowContent, { compactBlankLines: true }, context.markdownBridge);
    const timelineMeta = resolveTimelineMeta(
        message,
        templateKind,
        statusLabel,
        !!context.showTimestamps
    );
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
    const workedSummary = templateKind === 'assistant' && timelineMeta.startsWith('Worked for ');
    const metaText = timelineDetails ? `${timelineDetails} ` : '';
    const tokenDurationSuffix = durationStaysInMeta ? '' : metaDurationSuffix;
    const fallbackLine = templateKind === 'assistant'
            ? { rawText: '', tokens: [{ text: '…' }] as AgentConsoleMarkdownToken[] }
            : { rawText: '', tokens: [] as AgentConsoleMarkdownToken[] };
    const sourceLines = markdownLines.length ? markdownLines : [fallbackLine as AgentConsoleMarkdownLine];
    const detailLimit = Math.max(1, Math.floor(context.messageDetailVisibleLines || 6));
    const detailToggle = timelineEvent && (sourceLines.length > detailLimit
        || String(displayContent).split('\n').length > detailLimit
        || String(message?.content || '').split('\n').length > detailLimit)
        ? (context.messageDetailOpen && selected ? 'Click to collapse' : 'Click to expand')
        : '';
    const timelineMetaStyle = resolveTimelineMetaStyle(theme, rowSelected, templateKind);
    const lines: AgentConsoleRenderedLine[] = sourceLines.map((line, index) => {
        const isFirst = index === 0;
        const isLast = index === sourceLines.length - 1;
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
        const tokens = isLast && tokenDurationSuffix
            ? [...rendered.tokens, { text: tokenDurationSuffix, tone: 'muted' as const, style: timelineMetaStyle }]
            : rendered.tokens;
        return {
            ...rendered,
            tokens,
            messageId: message?.id,
            toggleContent: isFirst ? detailToggle : '',
            role: isFirst ? rendered.role : rendered.role ? '    ' : '',
            roleStyle: isFirst ? rendered.roleStyle : {},
            meta: workedSummary ? '' : (isFirst ? metaText : ''),
            metaStyle: workedSummary ? {} : (isFirst || isLast ? timelineMetaStyle : {}),
            ariaLabel: [
                isFirst ? presentation.title : '',
                isFirst && String(timelineMeta || '').split(' · ').includes(String(rendered.statusLabel || '')) ? '' : isFirst ? rendered.statusLabel : '',
                isLast && !workedSummary ? timelineMeta : '',
                rendered.prefix,
                rendered.content
            ].filter(part => String(part || '').trim()).join(' ').replace(/\s+/g, ' ').trim(),
            itemStyle: {
                ...itemStyle,
                padding: resolveSemanticLinePadding(presentation, isFirst, isLast, timelineEvent),
                margin: resolveSemanticLineMargin(presentation, isFirst, timelineEvent, String(itemStyle.margin || '0'))
            },
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

function renderAgentConsolePlainTextLines(
    content: string,
    options: { compactBlankLines?: boolean } = {}
): AgentConsoleMarkdownLine[] {
    const lines = String(content || '')
        .replace(/\r/g, '')
        .split('\n')
        .map(rawText => ({
            rawText,
            tokens: rawText ? [{ text: rawText }] as AgentConsoleMarkdownToken[] : []
        }));
    if (!options.compactBlankLines) {
        return lines;
    }
    const normalized: AgentConsoleMarkdownLine[] = [];
    lines.forEach(line => {
        const text = flattenAgentConsoleMarkdownLine(line).trim();
        if (!text && (!normalized.length || !flattenAgentConsoleMarkdownLine(normalized[normalized.length - 1]).trim())) {
            return;
        }
        normalized.push(line);
    });
    while (normalized.length && !flattenAgentConsoleMarkdownLine(normalized[0]).trim()) {
        normalized.shift();
    }
    while (normalized.length && !flattenAgentConsoleMarkdownLine(normalized[normalized.length - 1]).trim()) {
        normalized.pop();
    }
    return normalized;
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
        const hasActive = items.some(item => item.status === 'pending' || item.status === 'in_progress');
        return hasActive ? 'running' : 'success';
    }
    if (message?.metadata?.uiKind === 'event') {
        const eventType = String(message.metadata.uiEventType || '').trim();
        // P292: the remote bridge reports plan_step_blocked with status
        // 'running' (the step id is in the content); the event type is the
        // authoritative state so the row shows ⊘ 阻塞 instead of a running ●.
        // Same for a failed step that arrives without an explicit error status.
        if (eventType === 'plan_step_blocked') {
            return 'blocked';
        }
        if (eventType === 'plan_step_failed') {
            return 'failed';
        }
        const status = String(message.metadata.status || '').trim();
        if (status === 'running' || status === 'success' || status === 'failed' || status === 'error' || status === 'blocked') {
            return status as AgentConsoleMessageStatus;
        }
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

export function resolveAgentConsoleMarkdownPrefixStyle(
    line: AgentConsoleMarkdownLine,
    theme: AgentConsoleTheme,
    rowSelected: boolean
): Record<string, string> {
    if (rowSelected) {
        return {};
    }
    if (line.prefixTone === 'quote') {
        return styleTextToObject(theme.statusLabel);
    }
    if (line.prefixTone === 'accent') {
        return {
            ...styleTextToObject(theme.toolsAccent),
            'font-weight': 'bold'
        };
    }
    if (line.prefixTone === 'heading') {
        return {
            ...styleTextToObject(theme.toolsAccent),
            'font-weight': 'bold'
        };
    }
    return styleTextToObject(theme.statusValue);
}

export function resolveAgentConsoleMarkdownToneStyle(
    tone: AgentConsoleMarkdownTone,
    theme: AgentConsoleTheme,
    templateKind: AgentConsoleMessageTemplateKind = 'system'
): Record<string, string> {
    switch (tone) {
        case 'accent':
            return styleTextToObject(theme.toolsAccent);
        case 'strong':
            return {
                ...styleTextToObject(templateKind === 'error' ? theme.statusErrorValue : theme.statusValue),
                'font-weight': 'bold'
            };
        case 'code':
            return {
                ...styleTextToObject(templateKind === 'error' ? theme.statusErrorValue : theme.toolsAccent),
                background: '#161b22'
            };
        case 'heading':
            return {
                ...styleTextToObject(templateKind === 'error' ? theme.statusErrorValue : theme.toolsAccent),
                'font-weight': 'bold'
            };
        case 'muted':
        case 'quote':
            return styleTextToObject(templateKind === 'error' ? theme.statusErrorValue : theme.statusLabel);
        default:
            if (templateKind === 'error') {
                return styleTextToObject(theme.statusErrorValue);
            }
            return styleTextToObject(theme.statusValue);
    }
}

function resolveBuiltinMessageRenderer(templateKind: AgentConsoleMessageTemplateKind): AgentConsoleResolvedMessageRenderer {
    return agentConsoleMessageRenderers.find(renderer => renderer.templateKind === templateKind)
        || agentConsoleMessageRenderers[agentConsoleMessageRenderers.length - 1];
}

function stripMentionContextBlock(content: string): string {
    const marker = '[Mention Context]';
    if (!content.startsWith(marker)) {
        return content;
    }
    const separator = content.indexOf('\n\n', marker.length);
    return separator >= 0 ? content.slice(separator + 2) : content;
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
        'border-left': resolveMessageRailColor(templateKind),
        ...(rowStyleText ? styleTextToObject(rowStyleText) : {})
    };
}

function resolveSemanticLinePadding(
    presentation: AgentConsoleSessionContentPresentation,
    isFirst: boolean,
    isLast: boolean,
    timelineEvent: boolean
): string {
    if (timelineEvent) return '0 1ch';
    if (presentation.family === 'execution') {
        return `${isFirst ? '0.2em' : '0'} 1ch ${isLast ? '0.2em' : '0'} 1ch`;
    }
    const vertical = presentation.kind === 'user' || presentation.kind === 'assistant-final' ? 0
        : presentation.family === 'decision' || presentation.family === 'diagnostic' ? 0.6
            : presentation.family === 'artifact' ? 0.4 : 0.5;
    if (presentation.kind === 'user') {
        return `${isFirst ? `${vertical}em` : '0'} 0 ${isLast ? `${vertical}em` : '0'} 1ch`;
    }
    return `${isFirst ? `${vertical}em` : '0'} 1ch ${isLast ? `${vertical}em` : '0'} 1ch`;
}

function resolveSemanticLineMargin(
    presentation: AgentConsoleSessionContentPresentation,
    isFirst: boolean,
    timelineEvent: boolean,
    fallback: string
): string {
    if (!isFirst) return '0';
    if (presentation.kind === 'user' || presentation.kind === 'assistant-final') return fallback;
    if (timelineEvent) return '0';
    if (presentation.family === 'execution') return '0.2em 0 0 0';
    if (presentation.family === 'decision' || presentation.family === 'diagnostic') return '0.55em 0 0 0';
    return '0.4em 0 0 0';
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
        tone: line.tone
    };
}

function resolveAgentConsoleMessageRoleLabel(message: AgentMessage | undefined, fallback: string): string {
    const uiKind = String(message?.metadata?.uiKind || '').trim();
    if (uiKind !== 'event') {
        return fallback;
    }
    const eventType = String(message?.metadata?.uiEventType || '').trim();
    if (/^tool_|^reasoning$/.test(eventType)) {
        return resolveMessageRoleLabel('tool');
    }
    if (eventType === 'error') {
        return resolveMessageRoleLabel('error');
    }
    return resolveMessageRoleLabel('system');
}

function resolveTimelineMeta(
    message: AgentMessage | undefined,
    templateKind: AgentConsoleMessageTemplateKind,
    statusLabel: string,
    showTimestamps = false
): string {
    const parts: string[] = [];
    let duration = '';
    const uiKind = String(message?.metadata?.uiKind || '').trim();
    if (templateKind === 'timelineHeader' || templateKind === 'timelineFooter' || templateKind === 'timelineCollapsed') {
        return '';
    }
    if (templateKind === 'timelineBoundary') {
        // P302: step boundary meta carries the optional step duration only;
        // the glyph column is the single state point (P289), timestamps and
        // textual status stay out of the row so it reads as a short title.
        const elapsedMs = Number(message?.metadata?.planStepElapsedMs);
        if (Number.isFinite(elapsedMs) && elapsedMs >= 0) {
            duration = formatTimelineSessionDuration(elapsedMs);
        }
        return duration ? duration : '';
    }
    if (uiKind === 'event') {
        // P237/rule 30: event rows expose total elapsed (backend durationMs
        // first, otherwise paired start/end); the caller renders it as the
        // trailing muted token so it stays at the end of the row.
        const durationMs = resolveMessageDurationMs(message);
        if (Number.isFinite(durationMs) && durationMs >= 0) {
            duration = formatTimelineDuration(durationMs);
        }
    } else if (templateKind === 'assistant') {
        // Final replies carry the aggregate Codex-style worked/done summary
        // instead of a bare timestamp; sub-second turns (often derived) would
        // only render "Worked for 0s", so the summary needs at least one second.
        const completedAt = Number(message?.metadata?.completedAt ?? message?.metadata?.endedAt ?? message?.metadata?.finishedAt ?? message?.createdAt);
        const durationMs = resolveMessageDurationMs(message);
        if (Number.isFinite(completedAt) && Number.isFinite(durationMs) && Math.round(durationMs / 1000) > 0) {
            return `Worked for ${formatWorkedDuration(durationMs)} · done ${formatDoneTime(completedAt)}`;
        }
    }
    if (uiKind !== 'event'
        && templateKind !== 'user'
        && showTimestamps
        && typeof message?.createdAt === 'number'
        && Number.isFinite(message.createdAt)) {
        const date = new Date(message.createdAt);
        parts.push(`${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`);
    }
    if (uiKind === 'event') {
        const label = String(message?.metadata?.label || '').trim();
        if (label) {
            parts.push(label);
        }
    }
    // Event rows keep meta purely factual (duration/label/action); the glyph
    // column is the single state point (P289), textual status stays in aria.
    // Error rows already carry the semantic status in their role label
    // (`Error · `). Adding the generic status label here produced
    // `Error ·  · 错误` in the transcript.
    if (statusLabel && templateKind !== 'assistant' && templateKind !== 'error' && uiKind !== 'event') {
        parts.push(statusLabel);
    }
    if (uiKind === 'event') {
        const actionLabel = resolveTimelineEventActionLabel(message, resolveAgentConsoleMessageStatus(message, templateKind));
        if (actionLabel) {
            parts.push(actionLabel);
        }
    }
    const details = parts.join(' · ');
    return `${details}${duration ? ` (${duration})` : ''}`;
}

function formatWorkedDuration(durationMs: number): string {
    const totalSeconds = Math.max(0, Math.round(durationMs / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return minutes ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

function formatDoneTime(timestamp: number): string {
    const date = new Date(timestamp);
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function resolveMessageDurationMs(message?: AgentMessage): number {
    const metadata = message?.metadata || {};
    const exact = Number(metadata.durationMs ?? metadata.elapsedMs);
    if (Number.isFinite(exact) && exact >= 0) return exact;
    const startedAt = Number(metadata.startedAt);
    const completedAt = Number(metadata.completedAt ?? metadata.endedAt ?? metadata.finishedAt);
    return Number.isFinite(startedAt) && Number.isFinite(completedAt) && completedAt >= startedAt
        ? completedAt - startedAt
        : NaN;
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

export function resolveTimelineEventActionLabel(
    message?: AgentMessage | null,
    statusKind?: AgentConsoleMessageStatus
): string {
    const metadata = message?.metadata || {};
    if (metadata.uiKind !== 'event') {
        return '';
    }
    const eventType = String(metadata.uiEventType || '').trim();
    const failed = statusKind === 'failed' || statusKind === 'error';
    if ((eventType.startsWith('tool_') || eventType === 'tool_call') && failed) {
        return 'retry';
    }
    if (eventType.startsWith('plan_step_') && (failed || statusKind === 'blocked'
        || eventType === 'plan_step_blocked' || String(metadata.status || '') === 'blocked')) {
        return '重试';
    }
    if (eventType === 'approval' || eventType === 'approval_request') {
        return '审批';
    }
    return '';
}

function formatTimelineDuration(durationMs: number): string {
    if (durationMs < 1000) {
        return `${Math.round(durationMs)}ms`;
    }
    const seconds = durationMs / 1000;
    return `${seconds >= 10 ? Math.round(seconds) : seconds.toFixed(1).replace(/\.0$/, '')}s`;
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

function resolveTimelineMetaStyle(
    theme: AgentConsoleTheme,
    rowSelected: boolean,
    templateKind: AgentConsoleMessageTemplateKind
): Record<string, string> {
    if (rowSelected) {
        return {};
    }
    void templateKind;
    return styleTextToObject(theme.statusLabel);
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

function resolveMessageRailColor(templateKind: AgentConsoleMessageTemplateKind): string {
    switch (templateKind) {
        case 'assistant':
            return '2px solid #2f81f7';
        case 'tool':
            return '2px solid #79c0ff';
        case 'error':
            return '2px solid #f85149';
        case 'user':
            return '2px solid #6e7681';
        default:
            return '2px solid #30363d';
    }
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
    const failed = status === 'failed' || status === 'error';
    const railStyle = styleTextToObject(failed ? theme.statusErrorValue : theme.statusLabel);
    return {
        ...style,
        margin: '0',
        'border-left': rowSelected
            ? style['border-left']
            : failed
                ? `2px solid ${railStyle.color || 'currentColor'}`
                : `1px solid ${railStyle.color || 'currentColor'}`
    };
}

function resolveTimelineRail(
    theme: AgentConsoleTheme,
    rowSelected: boolean,
    tone: 'muted' | 'accent'
): string {
    if (rowSelected) {
        return '2px solid transparent';
    }
    const style = styleTextToObject(tone === 'accent' ? theme.toolsAccent : theme.statusLabel);
    return `2px solid ${style.color || 'currentColor'}`;
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
