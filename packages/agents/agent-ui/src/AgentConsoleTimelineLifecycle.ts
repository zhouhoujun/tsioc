import { AgentMessage } from '@tsdi/agent';

export interface AgentConsoleTimelineIdentity {
    eventKey: string;
    toolCallId?: string;
    receiptId?: string;
}

export function findTimelineLifecycleMessageIndex(
    messages: AgentMessage[],
    identity: AgentConsoleTimelineIdentity
): number {
    const eventKey = String(identity.eventKey || '').trim();
    const toolCallId = String(identity.toolCallId || '').trim();
    const receiptId = String(identity.receiptId || '').trim();
    return messages.findIndex(message => {
        const metadata = message?.metadata;
        if (metadata?.uiKind !== 'event') return false;
        if (eventKey && metadata.uiEventKey === eventKey) return true;
        if (!isSameTimelineScope(String(metadata.uiEventKey || ''), eventKey)) return false;
        const timeline = metadata.timeline || {};
        if (toolCallId && String(timeline.toolCallId || '').trim() === toolCallId) return true;
        return !toolCallId && receiptId && String(timeline.receiptId || '').trim() === receiptId;
    });
}

function isSameTimelineScope(leftKey: string, rightKey: string): boolean {
    return timelineScope(leftKey) === timelineScope(rightKey);
}

function timelineScope(eventKey: string): string {
    const marker = eventKey.indexOf(':tool:');
    return marker >= 0 ? eventKey.slice(0, marker) : '';
}

export function shouldApplyTimelineLifecycleUpdate(
    current: AgentMessage | undefined,
    incoming: { sequence?: number; attempt?: number; status?: string }
): boolean {
    if (!current) return true;
    const timeline = current.metadata?.timeline || {};
    const currentSequence = finiteNumber(timeline.sequence);
    const incomingSequence = finiteNumber(incoming.sequence);
    if (currentSequence !== undefined && incomingSequence !== undefined && incomingSequence < currentSequence) {
        return false;
    }
    const currentAttempt = finiteNumber(timeline.attempt) || 1;
    const incomingAttempt = finiteNumber(incoming.attempt) || 1;
    if (incomingAttempt < currentAttempt) return false;
    const currentStatus = String(current.metadata?.status || '');
    const incomingStatus = String(incoming.status || '');
    if (incomingAttempt === currentAttempt && isTerminalStatus(currentStatus) && incomingStatus === 'running') {
        return false;
    }
    return true;
}

function finiteNumber(value: unknown): number | undefined {
    const number = Number(value);
    return Number.isFinite(number) ? number : undefined;
}

export function isTerminalUiEventStatus(status?: string): boolean {
    return status === 'success' || status === 'failed' || status === 'error' || status === 'cancelled';
}

function isTerminalStatus(status: string): boolean {
    return isTerminalUiEventStatus(status);
}
