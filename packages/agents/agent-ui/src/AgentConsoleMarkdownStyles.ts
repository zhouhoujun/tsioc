import {
    AgentConsoleMarkdownLine,
    AgentConsoleMarkdownTone
} from './AgentConsoleMarkdown';
import type { AgentConsoleMessageTemplateKind } from './AgentConsoleMessageRenderers';
import { AgentConsoleTheme, styleTextToObject } from './AgentConsoleTheme';
import { flattenAgentConsoleMarkdownLine } from './markdown/spacing';

/** Chrome for Markdown block prefixes (headings, quotes, list markers). */
export function resolveAgentConsoleMarkdownPrefixStyle(
    line: AgentConsoleMarkdownLine,
    theme: AgentConsoleTheme,
    rowSelected: boolean
): Record<string, string> {
    if (rowSelected) {
        return {};
    }
    if (line.prefixTone === 'quote') {
        return styleTextToObject(theme.statusNoticeLabel);
    }
    if (line.prefixTone === 'accent') {
        // List/task markers stay quiet so the message body keeps the weight.
        return styleTextToObject(theme.toolsAccent);
    }
    if (line.prefixTone === 'heading') {
        return {
            ...styleTextToObject(theme.toolsAccent),
            'font-weight': 'bold'
        };
    }
    return styleTextToObject(theme.statusValue);
}

/** Inline tone palette shared by the DOM and TUI renderers. */
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
            // Code body reads as body text; the fence frame provides the chrome.
            return styleTextToObject(templateKind === 'error' ? theme.statusErrorValue : theme.statusValue);
        case 'inline-code':
            return {
                ...styleTextToObject(templateKind === 'error' ? theme.statusErrorValue : theme.statusIdleValue),
                background: '#161b22'
            };
        case 'link':
            return {
                ...styleTextToObject(templateKind === 'error' ? theme.statusErrorValue : theme.toolsAccent),
                'text-decoration': 'underline'
            };
        case 'heading':
            // opencode keeps headings in the body colour; weight + rhythm carry them.
            return {
                ...styleTextToObject(templateKind === 'error' ? theme.statusErrorValue : theme.statusValue),
                'font-weight': 'bold'
            };
        case 'emphasis':
            return {
                ...styleTextToObject(theme.statusNoticeValue),
                'font-style': 'italic'
            };
        case 'strike':
            return {
                ...styleTextToObject(theme.statusLabel),
                'text-decoration': 'line-through'
            };
        case 'syntax-keyword':
            // opencode syntax uses a warm keyword colour, distinct from functions.
            return styleTextToObject(templateKind === 'error' ? theme.statusErrorValue : theme.statusErrorLabel);
        case 'syntax-string':
            return styleTextToObject(theme.statusIdleValue);
        case 'syntax-number':
        case 'syntax-constant':
            return styleTextToObject(theme.statusBusyValue);
        case 'syntax-comment':
            return {
                ...styleTextToObject(theme.statusLabel),
                'font-style': 'italic'
            };
        case 'syntax-property':
        case 'syntax-variable':
            return styleTextToObject(theme.statusValue);
        case 'syntax-type':
        case 'syntax-tag':
            return styleTextToObject(theme.toolsAccent);
        case 'syntax-attribute':
            return styleTextToObject(theme.statusNoticeValue);
        case 'syntax-function':
            return styleTextToObject(theme.toolsAccent);
        case 'muted':
            return styleTextToObject(templateKind === 'error' ? theme.statusErrorValue : theme.statusLabel);
        case 'quote':
            // opencode tints blockquotes yellow; italics keep the body readable.
            return {
                ...styleTextToObject(templateKind === 'error' ? theme.statusErrorValue : theme.statusNoticeLabel),
                'font-style': 'italic'
            };
        default:
            if (templateKind === 'error') {
                return styleTextToObject(theme.statusErrorValue);
            }
            if (templateKind === 'timelineHeader' || templateKind === 'timelineFooter' || templateKind === 'timelineCollapsed') {
                return styleTextToObject(theme.statusTitle);
            }
            return styleTextToObject(theme.statusValue);
    }
}

/** A Markdown block-rhythm row carries only the zero-width blank marker. */
export function isAgentConsoleBlankMarkdownLine(line: AgentConsoleMarkdownLine): boolean {
    return !flattenAgentConsoleMarkdownLine(line).replace(/\u200b/g, '').trim();
}

/**
 * Per-line style: rhythm rows are spacing, not content, so they keep no padding
 * or margins; content rows use the semantic line spacing.
 */
export function resolveAgentConsoleLineItemStyle(
    itemStyle: Record<string, string>,
    padding: string,
    margin: string,
    blank: boolean,
    continuationIndent = 0
): Record<string, string> {
    if (blank) {
        return { ...itemStyle, padding: '0', margin: '0' };
    }
    const style: Record<string, string> = { ...itemStyle, padding, margin };
    if (continuationIndent > 0) {
        // DOM hanging indent; TUI uses the continuationIndent attribute.
        style['padding-left'] = `${continuationIndent}ch`;
        style['text-indent'] = `-${continuationIndent}ch`;
    }
    return style;
}
