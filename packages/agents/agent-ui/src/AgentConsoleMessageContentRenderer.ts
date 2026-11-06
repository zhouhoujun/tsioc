import { AgentMessage, getAgentMessageImageParts, summarizeToolDisplayText } from '@tsdi/agent';
import {
    AgentConsoleMarkdownLine,
    AgentConsoleMarkdownRenderOptions,
    renderAgentConsoleMarkdownLines
} from './AgentConsoleMarkdown';
import { AgentConsoleTheme } from './AgentConsoleTheme';
import { resolvePlanTodoContent } from './AgentConsolePlanState';
import {
    resolveAgentConsoleMarkdownPrefixStyle,
    resolveAgentConsoleMarkdownToneStyle
} from './AgentConsoleMarkdownStyles';
import { stripMentionContextBlock } from './AgentConsoleMessageLineStyles';
import type { MarkdownWorkerBridge } from './MarkdownWorkerBridge';
import type {
    AgentConsoleInlineRowStyle,
    AgentConsoleMessageStatus,
    AgentConsoleMessageTemplateKind,
    AgentConsoleRenderedLine,
    AgentConsoleResolvedMessageRenderer
} from './AgentConsoleMessageRenderers';

export function resolveMarkdownLines(
    content: string,
    options: import('./AgentConsoleMarkdown').AgentConsoleMarkdownRenderOptions,
    bridge?: MarkdownWorkerBridge
): AgentConsoleMarkdownLine[] {
    if (bridge) {
        return bridge.render(content, options);
    }
    return renderAgentConsoleMarkdownLines(content, options);
}

export function resolveMessageDisplayContent(
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

export function buildRenderedLine(
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
        tone: line.tone,
        code: line.code,
        codeData: line.codeData,
        table: line.table,
        tableData: line.tableData
    };
}
