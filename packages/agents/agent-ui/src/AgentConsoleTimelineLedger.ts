import type {
    TimelineWindowItem,
    TimelineWindowLedgerOptions,
    TimelineWindowLedgerResult
} from './AgentConsoleTimelineWindow';
import {
    classifyItem,
    estimateRows,
    isCurrentScope,
    isError,
    isStructural,
    makeSummary,
    withTimelineBounds,
    withTurnCollapse
} from './AgentConsoleTimelineWindow';

export function resolveTimelineWindowLedger(
    options: TimelineWindowLedgerOptions
): TimelineWindowLedgerResult {
    const { messages, limit, mode, activeScope, header, footer } = options;

    if (mode === 'verbose') {
        return withTurnCollapse(withTimelineBounds({
            items: messages.map(msg => {
                const struct = isStructural(msg.metadata);
                const err = isError(msg.metadata);
                const current = isCurrentScope(msg, activeScope);
                const { priority, category } = classifyItem(msg, activeScope, struct, err, current);
                return { message: msg, priority, category, estimatedRows: estimateRows(msg) };
            }),
            hiddenCount: 0
        }, header, footer), options);
    }

    if (messages.length <= limit) {
        return withTurnCollapse(withTimelineBounds({
            items: messages.map(msg => {
                const struct = isStructural(msg.metadata);
                const err = isError(msg.metadata);
                const current = isCurrentScope(msg, activeScope);
                const { priority, category } = classifyItem(msg, activeScope, struct, err, current);
                return { message: msg, priority, category, estimatedRows: estimateRows(msg) };
            }),
            hiddenCount: 0
        }, header, footer), options);
    }

    const structural = messages.filter(msg => isStructural(msg.metadata));
    const transcript = messages.filter(msg => !isStructural(msg.metadata));

    if (mode === 'compact') {
        const current = activeScope
            ? transcript.filter(msg => isCurrentScope(msg, activeScope))
            : [];
        const errors = transcript.filter(msg => isError(msg.metadata));

        const retained = new Set<string>();
        current.forEach(msg => { if (msg.id) retained.add(msg.id); });
        errors.forEach(msg => { if (msg.id) retained.add(msg.id); });
        const visible = transcript.filter(msg => msg.id != null && retained.has(msg.id));
        const hidden = transcript.length - visible.length;

        const items: TimelineWindowItem[] = [];
        if (hidden > 0) {
            items.push(makeSummary(hidden, mode, messages[0], options.summaryLabels));
        }
        visible.forEach(msg => {
            const struct = isStructural(msg.metadata);
            const err = isError(msg.metadata);
            const current = isCurrentScope(msg, activeScope);
            const { priority, category } = classifyItem(msg, activeScope, struct, err, current);
            items.push({ message: msg, priority, category, estimatedRows: estimateRows(msg) });
        });
        structural.forEach(msg => {
            const err = isError(msg.metadata);
            const { priority, category } = classifyItem(msg, activeScope, true, err, false);
            items.push({ message: msg, priority, category, estimatedRows: estimateRows(msg) });
        });

        return withTurnCollapse(withTimelineBounds({ items, hiddenCount: hidden }, header, footer), options);
    }

    // steps mode (default): tail + active scope + structural
    const current = activeScope
        ? transcript.filter(msg => isCurrentScope(msg, activeScope))
        : [];
    const tail = transcript.slice(-limit);
    const retained = new Set(tail.map(msg => msg.id));
    current.forEach(msg => retained.add(msg.id));
    const visible = transcript.filter(msg => retained.has(msg.id));
    const hidden = transcript.length - visible.length;

    const items: TimelineWindowItem[] = [];
    if (hidden > 0) {
        items.push(makeSummary(hidden, mode, messages[0], options.summaryLabels));
    }
    visible.forEach(msg => {
        const err = isError(msg.metadata);
        const inTail = tail.some(t => t.id === msg.id);
        const inCurrent = current.some(c => c.id === msg.id);
        if (inCurrent) {
            const { priority, category } = classifyItem(msg, activeScope, false, err, true);
            items.push({ message: msg, priority, category, estimatedRows: estimateRows(msg) });
        } else if (inTail) {
            const { priority, category } = classifyItem(msg, activeScope, false, err, false);
            items.push({ message: msg, priority, category, estimatedRows: estimateRows(msg) });
        }
    });
    structural.forEach(msg => {
        const err = isError(msg.metadata);
        const { priority, category } = classifyItem(msg, activeScope, true, err, false);
        items.push({ message: msg, priority, category, estimatedRows: estimateRows(msg) });
    });

    return withTurnCollapse(withTimelineBounds({ items, hiddenCount: hidden }, header, footer), options);
}
