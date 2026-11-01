import {
    AgentConsoleMarkdownLine,
    AgentConsoleMarkdownTone
} from './AgentConsoleMarkdown';
import type { AgentConsoleMessageTemplateKind } from './AgentConsoleMessageRenderers';
import { AgentConsoleTheme, styleTextToObject } from './AgentConsoleTheme';

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
                ...styleTextToObject(templateKind === 'error' ? theme.statusErrorValue : theme.sessionsAccent),
                'font-weight': 'bold'
            };
        case 'code':
            return {
                ...styleTextToObject(templateKind === 'error' ? theme.statusErrorValue : theme.toolsAccent),
                background: '#161b22'
            };
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
            return {
                ...styleTextToObject(templateKind === 'error' ? theme.statusErrorValue : theme.toolsAccent),
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
            return styleTextToObject(theme.toolsAccent);
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
            return styleTextToObject(theme.statusValue);
        case 'syntax-type':
        case 'syntax-tag':
            return styleTextToObject(theme.sessionsAccent);
        case 'syntax-variable':
            return styleTextToObject(theme.statusNoticeLabel);
        case 'syntax-attribute':
            return styleTextToObject(theme.statusNoticeValue);
        case 'syntax-function':
            return styleTextToObject(theme.toolsAccent);
        case 'muted':
        case 'quote':
            return styleTextToObject(templateKind === 'error' ? theme.statusErrorValue : theme.statusLabel);
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
