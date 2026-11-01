import { CommonSyntaxState } from '@tsdi/components/common';
import { renderMarkdownBlockLine } from './blocks';
import {
    renderCodeFenceFooter,
    renderCodeFenceHeader,
    renderCodeLineTokens,
    resetCommonSyntaxState
} from './code';
import { finalizeAgentConsoleMarkdownLines } from './layout';
import {
    AgentConsoleMarkdownLine,
    AgentConsoleMarkdownRenderOptions,
    DEFAULT_MARKDOWN_TABLE_WIDTH
} from './model';
import { normalizeMarkdownStructure } from './structure';
import {
    isMarkdownTableHeader,
    renderMarkdownTable,
    splitMarkdownTableRow
} from './table';

/**
 * Document orchestration: walk the source once, hand each construct to its
 * feature module (fence → code, header+delimiter pair → table, everything else
 * → block), then let `layout` restore blank-line rhythm.
 */
export function renderAgentConsoleMarkdownLines(
    content: string,
    options: AgentConsoleMarkdownRenderOptions = {}
): AgentConsoleMarkdownLine[] {
    const normalizedContent = normalizeMarkdownStructure(content);
    const sourceLines = String(normalizedContent || '').replace(/\r/g, '').split('\n');
    const rendered: AgentConsoleMarkdownLine[] = [];
    const tableWidth = Math.max(24, Math.floor(Number(options.tableWidth) || DEFAULT_MARKDOWN_TABLE_WIDTH));
    const codeState: CommonSyntaxState = {};
    let inFence = false;
    let fenceLanguage = '';
    let unclosedFenceStart = -1;
    let unclosedFenceRenderStart = -1;

    for (let sourceIndex = 0; sourceIndex < sourceLines.length; sourceIndex++) {
        const sourceLine = sourceLines[sourceIndex];
        const trimmed = sourceLine.trim();
        if (trimmed.startsWith('```')) {
            if (!inFence && options.treatUnclosedFenceAsText && unclosedFenceStart < 0) {
                unclosedFenceStart = sourceIndex;
                unclosedFenceRenderStart = rendered.length;
            }
            if (options.preserveFenceMarkers) {
                rendered.push({
                    rawText: sourceLine,
                    tokens: sourceLine ? [{ text: sourceLine, tone: 'muted' }] : [],
                    tone: 'muted'
                });
            }
            if (!inFence) {
                if (!options.preserveFenceMarkers) {
                    rendered.push(renderCodeFenceHeader(trimmed.slice(3).trim()));
                }
                fenceLanguage = trimmed.slice(3).trim().toLowerCase();
                resetCommonSyntaxState(codeState);
            } else if (!options.preserveFenceMarkers) {
                rendered.push(renderCodeFenceFooter());
                fenceLanguage = '';
            }
            inFence = !inFence;
            if (!inFence) {
                unclosedFenceStart = -1;
                unclosedFenceRenderStart = -1;
            }
            continue;
        }

        if (inFence) {
            rendered.push({
                rawText: sourceLine,
                prefix: sourceLine ? '│ ' : '',
                prefixTone: 'muted',
                tokens: sourceLine ? renderCodeLineTokens(sourceLine, fenceLanguage, codeState) : [],
                tone: 'code',
                code: true
            });
            continue;
        }

        const headerCells = splitMarkdownTableRow(sourceLine);
        const delimiterCells = splitMarkdownTableRow(sourceLines[sourceIndex + 1] || '');
        if (isMarkdownTableHeader(sourceLine, headerCells, delimiterCells)) {
            const rows: string[][] = [];
            let rowIndex = sourceIndex + 2;
            while (rowIndex < sourceLines.length) {
                const rowLine = sourceLines[rowIndex];
                if (!rowLine.trim() || !rowLine.includes('|') || rowLine.trim().startsWith('```')) {
                    break;
                }
                rows.push(splitMarkdownTableRow(rowLine));
                rowIndex += 1;
            }
            rendered.push(...renderMarkdownTable(headerCells, delimiterCells, rows, tableWidth));
            sourceIndex = rowIndex - 1;
            continue;
        }

        rendered.push(renderMarkdownBlockLine(sourceLine, tableWidth));
    }

    // Streaming can end inside a fence. When the caller asked for
    // `treatUnclosedFenceAsText`, re-render that tail as prose so a half-written
    // code block does not flash a frame (or swallow the answer).
    if (unclosedFenceRenderStart >= 0 && options.treatUnclosedFenceAsText) {
        const unclosedSection = sourceLines.slice(unclosedFenceStart);
        rendered.splice(
            unclosedFenceRenderStart,
            rendered.length - unclosedFenceRenderStart,
            ...unclosedSection.map(sourceLine => renderMarkdownBlockLine(sourceLine, tableWidth))
        );
    }

    return finalizeAgentConsoleMarkdownLines(rendered, options);
}
