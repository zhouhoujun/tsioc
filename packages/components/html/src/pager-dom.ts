import { PagerViewLine } from '@tsdi/components/common';

const HIGHLIGHT_CLASS: Record<string, string> = {
    match: 'pager-match',
    current: 'pager-match-current'
};

/**
 * Render a renderer-neutral pager view into a DOM container: one row element per
 * pager line, with spans for find matches. Mirrors the TUI pager exactly because
 * both consume the shared `composePagerViewLines` output.
 */
export function renderPagerView(doc: Document, container: Element, lines: PagerViewLine[]): void {
    container.textContent = '';
    for (const line of lines) {
        const row = doc.createElement('div');
        row.className = line.kind === 'hud' ? 'pager-hud' : 'pager-line';
        if (line.row != null) {
            row.setAttribute('data-row', String(line.row));
        }
        for (const segment of line.segments) {
            const cls = HIGHLIGHT_CLASS[segment.highlight];
            if (cls) {
                const span = doc.createElement('span');
                span.className = cls;
                span.textContent = segment.text;
                row.appendChild(span);
            } else {
                row.appendChild(doc.createTextNode(segment.text));
            }
        }
        container.appendChild(row);
    }
}
