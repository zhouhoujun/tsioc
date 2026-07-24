import { AgentMessage, summarizeToolDisplayText } from '@tsdi/agent';
import {
    AgentConsoleMarkdownLine,
    AgentConsoleMarkdownToken,
    AgentConsoleMarkdownTone,
    flattenAgentConsoleMarkdownLine,
    renderAgentConsoleMarkdownLines
} from './AgentConsoleMarkdown';
import { AgentConsoleTheme, defaultAgentConsoleTheme, styleTextToObject } from './AgentConsoleTheme';

export type AgentConsoleMessageTemplateKind = 'user' | 'assistant' | 'tool' | 'error' | 'system';

export interface AgentConsoleRenderedToken extends AgentConsoleMarkdownToken {
    style: Record<string, string>;
}

export interface AgentConsoleRenderedLine {
    statusKind?: AgentConsoleMessageStatus;
    statusLabel?: string;
    status?: string;
    statusStyle?: Record<string, string>;
    role?: string;
    roleStyle?: Record<string, string>;
    prefix?: string;
    prefixStyle?: Record<string, string>;
    content: string;
    tokens: AgentConsoleRenderedToken[];
    itemStyle?: Record<string, string>;
    lineStyle?: Record<string, string>;
    tone?: AgentConsoleMarkdownTone;
    renderRegion?: string;
}

export interface AgentConsoleRenderedMessageItem {
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
}

export type AgentConsoleMessageStatus = 'running' | 'success' | 'failed' | 'error';

export interface AgentConsoleMessageStatusLabels {
    running?: string;
    success?: string;
    failed?: string;
    error?: string;
}

type AgentConsoleInlineRowStyle = Partial<Record<'background' | 'background-color' | 'color' | 'font-weight', string>>;

export interface AgentConsoleMessageRenderContext {
    theme?: AgentConsoleTheme;
    selectedMessageId?: string;
    messagesFocused?: boolean;
    statusLabels?: AgentConsoleMessageStatusLabels;
    statusSymbol?: string;
}

interface AgentConsoleResolvedMessageRenderer {
    templateKind: AgentConsoleMessageTemplateKind;
    roleLabel: string;
    roleStyle: (theme: AgentConsoleTheme) => Record<string, string>;
    itemStyle: (theme: AgentConsoleTheme, rowSelected: boolean) => Record<string, string>;
    lead: (rowSelected: boolean) => string;
    continuationLead: (rowSelected: boolean) => string;
}

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
            return styleTextToObject(theme.toolsAccent);
        case 'tool':
            return styleTextToObject(theme.toolsAccent);
        case 'error':
            return styleTextToObject(theme.statusErrorValue);
        default:
            return styleTextToObject(theme.statusLabel);
    }
}

const agentConsoleMessageRenderers: AgentConsoleResolvedMessageRenderer[] = [
    {
        templateKind: 'error',
        roleLabel: resolveMessageRoleLabel('error'),
        roleStyle: theme => resolveMessageRoleStyle(theme, 'error'),
        itemStyle: (theme, rowSelected) => resolveMessageRowStyle(theme, rowSelected, theme.messagesShell),
        lead: () => '',
        continuationLead: () => ''
    },
    {
        templateKind: 'tool',
        roleLabel: resolveMessageRoleLabel('tool'),
        roleStyle: theme => resolveMessageRoleStyle(theme, 'tool'),
        itemStyle: (theme, rowSelected) => resolveMessageRowStyle(theme, rowSelected, theme.messagesShell),
        lead: () => '',
        continuationLead: () => ''
    },
    {
        templateKind: 'assistant',
        roleLabel: resolveMessageRoleLabel('assistant'),
        roleStyle: theme => resolveMessageRoleStyle(theme, 'assistant'),
        itemStyle: (theme, rowSelected) => resolveMessageRowStyle(theme, rowSelected, theme.messagesShell),
        lead: () => '',
        continuationLead: () => ''
    },
    {
        templateKind: 'user',
        roleLabel: resolveMessageRoleLabel('user'),
        roleStyle: theme => resolveMessageRoleStyle(theme, 'user'),
        itemStyle: (theme, rowSelected) => resolveMessageRowStyle(theme, rowSelected, theme.messagesUser),
        lead: () => '',
        continuationLead: () => ''
    },
    {
        templateKind: 'system',
        roleLabel: resolveMessageRoleLabel('system'),
        roleStyle: theme => resolveMessageRoleStyle(theme, 'system'),
        itemStyle: (theme, rowSelected) => resolveMessageRowStyle(theme, rowSelected, theme.messagesShell),
        lead: () => '',
        continuationLead: () => ''
    }
];

export function renderAgentConsoleMessageItems(
    messages: AgentMessage[],
    context: AgentConsoleMessageRenderContext = {}
): AgentConsoleRenderedMessageItem[] {
    return (messages || []).map(message => renderAgentConsoleMessageItem(message, context));
}

export function renderAgentConsoleMessageItem(
    message: AgentMessage,
    context: AgentConsoleMessageRenderContext = {}
): AgentConsoleRenderedMessageItem {
    const theme = context.theme || defaultAgentConsoleTheme;
    const templateKind = resolveMessageTemplateKind(message);
    const renderer = resolveMessageRenderer(templateKind);
    const selected = message?.id === context.selectedMessageId;
    const rowSelected = !!(selected && context.messagesFocused);
    const itemStyle = renderer.itemStyle(theme, rowSelected);
    const inlineRowStyle = resolveInlineRowStyle(itemStyle);
    const roleLabel = resolveAgentConsoleMessageRoleLabel(message, renderer.roleLabel);
    const statusKind = resolveAgentConsoleMessageStatus(message, templateKind);
    const statusLabel = resolveAgentConsoleMessageStatusLabel(statusKind, context.statusLabels);
    const status = formatAgentConsoleMessageStatus(statusKind, context.statusSymbol);
    const statusStyle = resolveAgentConsoleMessageStatusStyle(theme, statusKind, rowSelected);
    const displayContent = resolveMessageDisplayContent(message, templateKind);
    const markdownLines = message?.metadata?.streaming
        ? renderAgentConsolePlainTextLines(displayContent, { compactBlankLines: true })
        : renderAgentConsoleMarkdownLines(displayContent, { compactBlankLines: true });
    const fallbackLine = templateKind === 'assistant'
        ? { rawText: '', tokens: [{ text: '…' }] as AgentConsoleMarkdownToken[] }
        : { rawText: '', tokens: [] as AgentConsoleMarkdownToken[] };
    const sourceLines = markdownLines.length ? markdownLines : [fallbackLine as AgentConsoleMarkdownLine];
    const lines = sourceLines.map((line, index) => {
        const isFirst = index === 0;
        const isLast = index === sourceLines.length - 1;
        const rendered = buildRenderedLine(
            line,
            isFirst ? renderer.lead(rowSelected) : renderer.continuationLead(rowSelected),
            roleLabel,
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
        return {
            ...rendered,
            role: isFirst ? rendered.role : rendered.role ? '  ' : '',
            roleStyle: isFirst ? rendered.roleStyle : {},
            itemStyle: {
                ...itemStyle,
                padding: `${isFirst ? '1em' : '0'} 1ch ${isLast ? '1em' : '0'} 1ch`
            },
            lineStyle: {
                ...(rendered.lineStyle || {}),
                ...resolveRenderedLineToneStyle(theme, rendered, rowSelected, templateKind)
            }
        };
    });

    return {
        kind: roleLabel,
        templateKind,
        selected,
        statusKind,
        statusLabel,
        status,
        statusStyle,
        itemStyle,
        lines
    };
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
    if (message?.metadata?.error) {
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
    if (!message || templateKind === 'user') {
        return undefined;
    }
    if (message?.metadata?.uiKind === 'event') {
        const status = String(message.metadata.status || '').trim();
        if (status === 'running' || status === 'success' || status === 'failed' || status === 'error') {
            return status as AgentConsoleMessageStatus;
        }
    }
    if (message?.metadata?.streaming) {
        return 'running';
    }
    if (String(message.role || '').toLowerCase() === 'tool' && message?.metadata?.error) {
        return 'failed';
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

function resolveMessageRenderer(templateKind: AgentConsoleMessageTemplateKind): AgentConsoleResolvedMessageRenderer {
    return agentConsoleMessageRenderers.find(renderer => renderer.templateKind === templateKind)
        || agentConsoleMessageRenderers[agentConsoleMessageRenderers.length - 1];
}

function resolveMessageDisplayContent(message: AgentMessage, templateKind: AgentConsoleMessageTemplateKind): string {
    const content = String(message?.content || '');
    if (templateKind !== 'tool') {
        return content;
    }
    const toolName = String(message?.metadata?.receipt?.toolName || message?.name || '').trim();
    return summarizeToolDisplayText(toolName, content, 'output') || content;
}

function resolveMessageRowStyle(
    theme: AgentConsoleTheme,
    rowSelected: boolean,
    baseStyleText: string
): Record<string, string> {
    const rowStyleText = rowSelected ? theme.messagesSelected : baseStyleText;
    return {
        padding: '1em 1ch',
        display: 'block',
        'box-sizing': 'border-box',
        'white-space': 'normal',
        'overflow-wrap': 'anywhere',
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

function resolveRenderedLineToneStyle(
    theme: AgentConsoleTheme,
    line: AgentConsoleRenderedLine,
    rowSelected: boolean,
    templateKind: AgentConsoleMessageTemplateKind
): Record<string, string> {
    if (rowSelected) {
        return {};
    }
    return resolveAgentConsoleMarkdownToneStyle(resolveRenderedLineTone(line), theme, templateKind);
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
    if (style.background) {
        inlineStyle.background = style.background;
        inlineStyle['background-color'] = style.background;
    }
    if (style['background-color']) {
        inlineStyle['background-color'] = style['background-color'];
        inlineStyle.background = style['background-color'];
    }
    if (style.color) {
        inlineStyle.color = style.color;
    }
    if (style['font-weight']) {
        inlineStyle['font-weight'] = style['font-weight'];
    }
    return inlineStyle;
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
