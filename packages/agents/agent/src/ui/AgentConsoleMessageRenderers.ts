import { AgentMessage } from '../runtime/AgentMessage';
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
    itemStyle: Record<string, string>;
    renderRegion?: string;
    lines: AgentConsoleRenderedLine[];
}

type AgentConsoleInlineRowStyle = Partial<Record<'background' | 'background-color' | 'color' | 'font-weight', string>>;

export interface AgentConsoleMessageRenderContext {
    theme?: AgentConsoleTheme;
    selectedMessageId?: string;
    messagesFocused?: boolean;
}

interface AgentConsoleResolvedMessageRenderer {
    templateKind: AgentConsoleMessageTemplateKind;
    roleLabel: string;
    roleStyle: (theme: AgentConsoleTheme) => Record<string, string>;
    itemStyle: (theme: AgentConsoleTheme, rowSelected: boolean) => Record<string, string>;
    lead: (rowSelected: boolean) => string;
    continuationLead: (rowSelected: boolean) => string;
}

const agentConsoleMessageRenderers: AgentConsoleResolvedMessageRenderer[] = [
    {
        templateKind: 'error',
        roleLabel: 'error',
        roleStyle: theme => styleTextToObject(theme.statusErrorValue),
        itemStyle: (theme, rowSelected) => resolveMessageRowStyle(theme, rowSelected, theme.messagesShell),
        lead: rowSelected => rowSelected ? '› ' : '',
        continuationLead: rowSelected => rowSelected ? '  ' : ''
    },
    {
        templateKind: 'tool',
        roleLabel: 'tool',
        roleStyle: theme => styleTextToObject(theme.toolsAccent),
        itemStyle: (theme, rowSelected) => resolveMessageRowStyle(theme, rowSelected, theme.messagesShell),
        lead: rowSelected => rowSelected ? '› ' : '',
        continuationLead: rowSelected => rowSelected ? '  ' : ''
    },
    {
        templateKind: 'assistant',
        roleLabel: 'agent',
        roleStyle: theme => styleTextToObject(theme.toolsAccent),
        itemStyle: (theme, rowSelected) => resolveMessageRowStyle(theme, rowSelected, theme.messagesShell),
        lead: rowSelected => rowSelected ? '› ' : '',
        continuationLead: rowSelected => rowSelected ? '  ' : ''
    },
    {
        templateKind: 'user',
        roleLabel: 'you',
        roleStyle: theme => styleTextToObject(theme.statusValue),
        itemStyle: (theme, rowSelected) => resolveMessageRowStyle(theme, rowSelected, theme.messagesUser),
        lead: () => '› ',
        continuationLead: () => '  '
    },
    {
        templateKind: 'system',
        roleLabel: 'system',
        roleStyle: theme => styleTextToObject(theme.statusLabel),
        itemStyle: (theme, rowSelected) => resolveMessageRowStyle(theme, rowSelected, theme.messagesShell),
        lead: rowSelected => rowSelected ? '› ' : '',
        continuationLead: rowSelected => rowSelected ? '  ' : ''
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
    const markdownLines = message?.metadata?.streaming
        ? renderAgentConsolePlainTextLines(message?.content || '', { compactBlankLines: true })
        : renderAgentConsoleMarkdownLines(message?.content || '', { compactBlankLines: true });
    const fallbackLine = renderer.roleLabel === 'agent'
        ? { rawText: '', tokens: [{ text: '…' }] as AgentConsoleMarkdownToken[] }
        : { rawText: '', tokens: [] as AgentConsoleMarkdownToken[] };
    const sourceLines = markdownLines.length ? markdownLines : [fallbackLine as AgentConsoleMarkdownLine];
    const lines = sourceLines.map((line, index) => {
        const isFirst = index === 0;
        const isLast = index === sourceLines.length - 1;
        const rendered = buildRenderedLine(
            line,
            isFirst ? renderer.lead(rowSelected) : renderer.continuationLead(rowSelected),
            renderer,
            theme,
            rowSelected,
            templateKind,
            inlineRowStyle
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
        kind: renderer.roleLabel,
        templateKind,
        selected,
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
    renderer: AgentConsoleResolvedMessageRenderer,
    theme: AgentConsoleTheme,
    rowSelected: boolean,
    templateKind: AgentConsoleMessageTemplateKind,
    inlineRowStyle: AgentConsoleInlineRowStyle
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
        role: roleLead,
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
