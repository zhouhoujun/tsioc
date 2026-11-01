import { tokenizeMarkdownInline } from './inline';
import { AgentConsoleMarkdownLine, AgentConsoleMarkdownTone, DEFAULT_MARKDOWN_TABLE_WIDTH } from './model';
import { getDisplayWidth } from '../AgentConsoleTextWidth';

/**
 * Block-level Markdown: headings, quotes, ordered/unordered lists, task items
 * and horizontal rules.
 */

const STANDALONE_STRONG_HEADING_RE = /^\s*(?:\*\*|__)([^*_`][^`]*?)(?:\*\*|__)\s*$/;
const SHORT_HEADING_RE = /^(\s*)([^:：\n]{1,36})([:：])\s*$/;

export function renderMarkdownBlockLine(sourceLine: string, width = DEFAULT_MARKDOWN_TABLE_WIDTH): AgentConsoleMarkdownLine {
    const original = String(sourceLine || '');
    let line = original;
    let prefix = '';
    let prefixTone: AgentConsoleMarkdownTone | undefined;
    let tone: AgentConsoleMarkdownTone | undefined;
    let continuationIndent: number | undefined;

    const strongHeadingMatch = STANDALONE_STRONG_HEADING_RE.exec(line);
    if (strongHeadingMatch) {
        return {
            rawText: original,
            tokens: tokenizeMarkdownInline(strongHeadingMatch[1].trim(), 'heading'),
            tone: 'heading'
        };
    }

    const shortHeadingMatch = SHORT_HEADING_RE.exec(line);
    if (shortHeadingMatch) {
        return {
            rawText: original,
            tokens: tokenizeMarkdownInline(shortHeadingMatch[2].trim(), 'heading'),
            tone: 'heading'
        };
    }

    const headingMatch = /^(\s*)(#{1,6})\s+(.*)$/.exec(line);
    if (headingMatch) {
        prefix = headingMatch[1];
        prefixTone = 'heading';
        // h1/h2 carry the section accent; deeper levels drop back to body
        // weight so long documents do not become a wall of highlighted headings.
        tone = headingMatch[2].length >= 3 ? 'strong' : 'heading';
        line = headingMatch[3];
    } else {
        const quoteMatch = /^(\s*)>\s?(.*)$/.exec(line);
        if (quoteMatch) {
            prefix = `${quoteMatch[1]}│ `;
            prefixTone = 'quote';
            tone = 'quote';
            continuationIndent = getDisplayWidth(prefix);
            line = quoteMatch[2];
        } else {
            const taskMatch = /^(\s*)[-*+]\s+\[([ xX])\]\s+(.*)$/.exec(line);
            if (taskMatch) {
                const checked = taskMatch[2].toLowerCase() === 'x';
                prefix = `${taskMatch[1]}${checked ? '☑' : '☐'} `;
                prefixTone = checked ? 'muted' : 'accent';
                continuationIndent = getDisplayWidth(prefix);
                line = taskMatch[3];
            } else {
                const orderedMatch = /^(\s*\d+\.)\s+(.*)$/.exec(line);
                if (orderedMatch) {
                    prefix = `${orderedMatch[1]} `;
                    prefixTone = 'accent';
                    continuationIndent = getDisplayWidth(prefix);
                    line = orderedMatch[2];
                } else {
                    const bulletMatch = /^(\s*)[-*+]\s+(.*)$/.exec(line);
                    if (bulletMatch) {
                        const depth = Math.floor(bulletMatch[1].replace(/\t/g, '  ').length / 2);
                        prefix = `${bulletMatch[1]}${depth >= 2 ? '▪' : depth === 1 ? '◦' : '•'} `;
                        prefixTone = 'accent';
                        continuationIndent = getDisplayWidth(prefix);
                        line = bulletMatch[2];
                    }
                }
            }
        }
    }

    if (/^\s*([-*_])(?:\s*\1){2,}\s*$/.test(original)) {
        const ruleWidth = Math.max(8, Math.min(DEFAULT_MARKDOWN_TABLE_WIDTH, Math.floor(width || DEFAULT_MARKDOWN_TABLE_WIDTH)));
        return {
            rawText: original,
            tokens: [{ text: '─'.repeat(ruleWidth), tone: 'muted' }],
            tone: 'muted'
        };
    }

    return {
        rawText: original,
        prefix,
        prefixTone,
        tokens: tokenizeMarkdownInline(line, tone),
        tone,
        continuationIndent
    };
}
