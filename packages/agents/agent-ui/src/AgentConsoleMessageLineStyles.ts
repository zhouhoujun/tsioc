import type { AgentConsoleSessionContentPresentation } from './AgentConsoleSessionContentPresenter';

/**
 * Vertical rhythm for one semantic transcript line. Extracted from the message
 * renderer so markdown/indent work does not keep growing the god file.
 */
export function resolveSemanticLinePadding(
    presentation: AgentConsoleSessionContentPresentation,
    isFirst: boolean,
    isLast: boolean,
    timelineEvent: boolean
): string {
    if (timelineEvent) return '0 1ch';
    if (presentation.family === 'execution') {
        return `${isFirst ? '0.2em' : '0'} 1ch ${isLast ? '0.2em' : '0'} 1ch`;
    }
    const vertical = presentation.kind === 'user' || presentation.kind === 'assistant-final' ? 0
        : presentation.family === 'decision' || presentation.family === 'diagnostic' ? 0.6
            : presentation.family === 'artifact' ? 0.4 : 0.5;
    if (presentation.kind === 'user') {
        return `${isFirst ? `${vertical}em` : '0'} 0 ${isLast ? `${vertical}em` : '0'} 1ch`;
    }
    return `${isFirst ? `${vertical}em` : '0'} 1ch ${isLast ? `${vertical}em` : '0'} 1ch`;
}

export function resolveSemanticLineMargin(
    presentation: AgentConsoleSessionContentPresentation,
    isFirst: boolean,
    timelineEvent: boolean,
    fallback: string
): string {
    if (!isFirst) return '0';
    if (presentation.kind === 'user') return fallback;
    // Give the conclusion air after the execution track (opencode spacing).
    if (presentation.kind === 'assistant-final') return '0.5em 0 0.25em 0';
    if (timelineEvent) return '0';
    if (presentation.family === 'execution') return '0.2em 0 0 0';
    if (presentation.family === 'decision' || presentation.family === 'diagnostic') return '0.55em 0 0 0';
    return '0.4em 0 0 0';
}
