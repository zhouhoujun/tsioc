import { CommonSyntaxState } from '@tsdi/components/common';
import { renderMarkdownBlockLine } from './blocks';
import { renderCodeLineTokens, resetCommonSyntaxState } from './code';
import { AgentConsoleMarkdownLine, AgentConsoleMarkdownRenderOptions, AgentConsoleMarkdownToken, DEFAULT_MARKDOWN_TABLE_WIDTH } from './model';
import { applyMarkdownBlockSpacing, compactMarkdownLines } from './spacing';
import { normalizeMarkdownStructure } from './structure';
import { isMarkdownTableHeader, renderMarkdownTable, splitMarkdownTableRow } from './table';

/**
 * Document walk: fenced code → code module, header+delimiter pairs → table
 * module, everything else → block module; spacing restores message rhythm.
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
    let codeBlockStart = -1;
    let codeBlockLanguage = '';
    const codeBlockLines: string[] = [];
    const codeBlockTokenLines: AgentConsoleMarkdownToken[][] = [];
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
                fenceLanguage = trimmed.slice(3).trim().toLowerCase();
                codeBlockLanguage = fenceLanguage;
                codeBlockStart = rendered.length;
                codeBlockLines.length = 0;
                codeBlockTokenLines.length = 0;
                resetCommonSyntaxState(codeState);
            } else {
                fenceLanguage = '';
                if (codeBlockStart >= 0 && rendered[codeBlockStart]) {
                    rendered[codeBlockStart] = {
                        ...rendered[codeBlockStart],
                        codeData: { language: codeBlockLanguage, text: codeBlockLines.join('\n'), lines: codeBlockTokenLines.slice() }
                    };
                }
                codeBlockStart = -1;
                codeBlockLines.length = 0;
                codeBlockTokenLines.length = 0;
            }
            inFence = !inFence;
            if (!inFence) {
                unclosedFenceStart = -1;
                unclosedFenceRenderStart = -1;
            }
            continue;
        }

        if (inFence) {
            const codeTokens = sourceLine ? renderCodeLineTokens(sourceLine, fenceLanguage, codeState) : [];
            codeBlockLines.push(sourceLine);
            codeBlockTokenLines.push(codeTokens);
            rendered.push({
                rawText: sourceLine,
                tokens: codeTokens,
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

    if (unclosedFenceRenderStart >= 0 && options.treatUnclosedFenceAsText) {
        const unclosedSection = sourceLines.slice(unclosedFenceStart);
        rendered.splice(
            unclosedFenceRenderStart,
            rendered.length - unclosedFenceRenderStart,
            ...unclosedSection.map(sourceLine => renderMarkdownBlockLine(sourceLine, tableWidth))
        );
    } else if (inFence && codeBlockStart >= 0 && rendered[codeBlockStart]) {
        rendered[codeBlockStart] = {
            ...rendered[codeBlockStart],
            codeData: { language: codeBlockLanguage, text: codeBlockLines.join('\n'), lines: codeBlockTokenLines.slice() }
        };
    }

    return options.compactBlankLines
        ? compactMarkdownLines(rendered)
        : applyMarkdownBlockSpacing(rendered);
}
