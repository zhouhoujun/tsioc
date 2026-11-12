import { PagerBox, PagerMatch } from './pager-box';

export type PagerHighlight = 'none' | 'match' | 'current';

export interface PagerViewSegment {
    text: string;
    highlight: PagerHighlight;
}

export interface PagerViewLine {
    kind: 'hud' | 'body';
    segments: PagerViewSegment[];
    /** 0-based content row for body lines. */
    row?: number;
}

/**
 * Host-supplied pager HUD copy. `withMatches` interpolates `{index}`/`{total}`
 * with the current find position; a host without copy keeps the English
 * defaults.
 */
export interface PagerStatusCopy {
    plain: string;
    withMatches: string;
}

export const DEFAULT_PAGER_STATUS_COPY: PagerStatusCopy = {
    plain: 'Pager · Esc close · ↑↓ scroll',
    withMatches: 'Pager {index}/{total} · Esc close · ↑↓ scroll'
};

/** One-line pager status/HUD text (platform-neutral). */
export function pagerStatusText(pager: PagerBox, copy?: PagerStatusCopy | null): string {
    const labels = copy || DEFAULT_PAGER_STATUS_COPY;
    if (!pager.matchCount) {
        return labels.plain;
    }
    return labels.withMatches
        .replace(/\{index\}/g, String(pager.currentMatchIndex + 1))
        .replace(/\{total\}/g, String(pager.matchCount));
}

/**
 * Renderer-neutral pager view: the HUD line plus the visible body lines split
 * into highlight segments, so the TUI (ANSI) and the DOM (spans) render identical
 * find results from the same {@link PagerBox} model.
 */
export function composePagerViewLines(pager: PagerBox, viewportHeight?: number, copy?: PagerStatusCopy | null): PagerViewLine[] {
    if (typeof viewportHeight === 'number') {
        pager.setViewportHeight(viewportHeight);
    }
    const range = pager.visibleRange();
    const current = pager.currentMatch;
    const lines: PagerViewLine[] = [{
        kind: 'hud',
        segments: [{ text: pagerStatusText(pager, copy), highlight: 'none' }]
    }];
    pager.visibleLines().forEach((line, index) => {
        lines.push({
            kind: 'body',
            row: range.start + index,
            segments: segmentPagerLine(line, pager.matchesAtRow(range.start + index), current)
        });
    });
    return lines;
}

function segmentPagerLine(line: string, matches: PagerMatch[], current?: PagerMatch): PagerViewSegment[] {
    if (!matches.length) {
        return [{ text: line, highlight: 'none' }];
    }
    const segments: PagerViewSegment[] = [];
    let cursor = 0;
    for (const match of matches) {
        if (match.column < cursor) {
            continue;
        }
        if (match.column > cursor) {
            segments.push({ text: line.slice(cursor, match.column), highlight: 'none' });
        }
        const isCurrent = !!current && current.row === match.row && current.column === match.column;
        segments.push({
            text: line.slice(match.column, match.column + match.length),
            highlight: isCurrent ? 'current' : 'match'
        });
        cursor = match.column + match.length;
    }
    if (cursor < line.length) {
        segments.push({ text: line.slice(cursor), highlight: 'none' });
    }
    return segments;
}
