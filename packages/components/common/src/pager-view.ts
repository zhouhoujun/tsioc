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

/** One-line pager status/HUD text (platform-neutral). */
export function pagerStatusText(pager: PagerBox): string {
    return pager.matchCount
        ? `Pager ${pager.currentMatchIndex + 1}/${pager.matchCount} · Esc close · ↑↓ scroll`
        : 'Pager · Esc close · ↑↓ scroll';
}

/**
 * Renderer-neutral pager view: the HUD line plus the visible body lines split
 * into highlight segments, so the TUI (ANSI) and the DOM (spans) render identical
 * find results from the same {@link PagerBox} model.
 */
export function composePagerViewLines(pager: PagerBox, viewportHeight?: number): PagerViewLine[] {
    if (typeof viewportHeight === 'number') {
        pager.setViewportHeight(viewportHeight);
    }
    const range = pager.visibleRange();
    const current = pager.currentMatch;
    const lines: PagerViewLine[] = [{
        kind: 'hud',
        segments: [{ text: pagerStatusText(pager), highlight: 'none' }]
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
