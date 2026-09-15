import { AgentMessage, getAgentMessageImageParts } from '@tsdi/agent';

export type AgentConsoleContentFamily = 'conversation' | 'execution' | 'decision' | 'artifact' | 'diagnostic';
export type AgentConsoleContentKind = 'user' | 'assistant-final' | 'assistant-partial' | 'thought' | 'tool'
    | 'command' | 'question' | 'approval' | 'plan' | 'file-change' | 'attachment'
    | 'error' | 'warning' | 'cancelled' | 'system';

export interface AgentConsoleSessionContentPresentation {
    family: AgentConsoleContentFamily;
    kind: AgentConsoleContentKind;
    title: string;
    summary: string;
    meta: string[];
    detailRef?: string;
    priority: 'primary' | 'active' | 'supporting';
    causalKey?: string;
    defaultExpanded: boolean;
}

export function presentAgentConsoleSessionContent(message: AgentMessage): AgentConsoleSessionContentPresentation {
    const metadata = message?.metadata || {};
    const uiKind = String(metadata.uiKind || '').trim();
    const eventType = String(metadata.uiEventType || '').trim();
    const status = String(metadata.status || '').trim();
    const summary = firstMeaningfulLine(message?.content);
    const causalKey = clean(metadata.causalKey || metadata.uiEventKey);
    const detailRef = clean(metadata.detailRef || (uiKind === 'event' ? message.id : undefined));
    const meta = [clean(metadata.durationMs != null ? `${metadata.durationMs}ms` : ''), clean(status)].filter(Boolean) as string[];

    if (message.role === 'user') return result('conversation', 'user', 'Request', summary, 'primary', true);
    if (uiKind === 'plan-todo') return result('artifact', 'plan', 'Plan', summary, 'active', true);
    if (uiKind === 'file-change') return result('artifact', 'file-change', 'Files changed', summary, 'supporting', false);
    if (uiKind === 'command-execution' || metadata.type === 'shell') {
        return result('execution', 'command', clean(metadata.command) || 'Command', summary, status === 'running' ? 'active' : 'supporting', status === 'running');
    }
    if (eventType === 'reasoning' || metadata.reasoning === true) {
        return result('execution', 'thought', 'Thought', summary, status === 'running' ? 'active' : 'supporting', status === 'running');
    }
    if (eventType === 'approval' || eventType === 'approval_request' || uiKind === 'approval') {
        return result('decision', 'approval', 'Approval required', summary, 'active', true);
    }
    if (eventType === 'question' || eventType === 'ask_user' || uiKind === 'question') {
        return result('decision', 'question', 'Question', summary, 'active', true);
    }
    if (uiKind === 'event' && (eventType.startsWith('tool_') || metadata.timeline?.toolCallId)) {
        return result('execution', 'tool', clean(metadata.uiEventLabel) || 'Tool', summary, status === 'running' ? 'active' : 'supporting', status === 'running');
    }
    if (metadata.error || status === 'error' || status === 'failed') {
        return result('diagnostic', 'error', 'Error', summary, 'active', true);
    }
    if (status === 'cancelled') return result('diagnostic', 'cancelled', 'Cancelled', summary, 'supporting', true);
    if (metadata.warning) return result('diagnostic', 'warning', 'Warning', summary, 'supporting', true);
    const hasAttachment = getAgentMessageImageParts(message).length > 0
        || (message.parts || []).some(part => part?.type === 'file');
    if (hasAttachment && !summary) {
        return result('artifact', 'attachment', 'Attachment', '', 'supporting', true);
    }
    if (message.role === 'assistant') {
        const partial = metadata.streaming || metadata.partial || metadata.preamble;
        return result('conversation', partial ? 'assistant-partial' : 'assistant-final', partial ? 'Response in progress' : 'Response', summary, partial ? 'active' : 'primary', true);
    }
    if (message.role === 'tool') return result('execution', 'tool', clean(message.name) || 'Tool', summary, 'supporting', false);
    return result('diagnostic', 'system', 'System', summary, 'supporting', false);

    function result(
        family: AgentConsoleContentFamily,
        kind: AgentConsoleContentKind,
        title: string,
        value: string,
        priority: AgentConsoleSessionContentPresentation['priority'],
        defaultExpanded: boolean
    ): AgentConsoleSessionContentPresentation {
        return { family, kind, title, summary: value, meta, detailRef, priority, causalKey, defaultExpanded };
    }
}

function firstMeaningfulLine(value: unknown): string {
    return String(value || '').split(/\r?\n/).map(line => line.trim()).find(Boolean) || '';
}

function clean(value: unknown): string | undefined {
    const text = String(value || '').trim();
    return text || undefined;
}
