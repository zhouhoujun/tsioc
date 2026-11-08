import { getDisplayWidth, sliceByDisplayWidth } from './AgentConsoleTextWidth';

export type AgentConsoleBrandLineRole = 'title' | 'rule' | 'meta';

export interface AgentConsoleBrandLine {
    text: string;
    role: AgentConsoleBrandLineRole;
}

/**
 * Welcome card for an empty transcript. Returns semantic rows only: the TUI
 * renderer draws the frame from CSS (centering the block) and the browser skin
 * draws a bordered card, so both platforms get a real frame instead of
 * box-drawing glyphs that cannot connect across DOM line heights.
 */
export function buildAgentConsoleBrandBlock(
    width: number,
    appTitle = 'TSDI Agent',
    model = '',
    workspace = ''
): AgentConsoleBrandLine[] {
    const title = String(appTitle || 'TSDI Agent').trim().toUpperCase().replace(/[_-]+/g, ' ');
    // Letter-space short wordmarks for a logo-like title; long titles stay
    // compact so narrow terminals do not clip the card.
    const wordmark = getDisplayWidth(title) <= 28
        ? title.split(/\s+/).filter(Boolean).map(word => word.split('').join(' ')).join('   ')
        : title;
    const meta = [String(model || '').trim(), String(workspace || '').trim()].filter(Boolean).join(' · ');
    const budget = Math.max(12, Math.min(48, Math.floor(width) - 8));
    const clippedMeta = getDisplayWidth(meta) > budget
        ? `${sliceByDisplayWidth(meta, Math.max(1, budget - 1))}…`
        : meta;
    const lines: AgentConsoleBrandLine[] = [{ text: wordmark, role: 'title' }, { text: '· · ·', role: 'rule' }];
    if (clippedMeta) {
        lines.push({ text: clippedMeta, role: 'meta' });
    }
    return lines;
}
