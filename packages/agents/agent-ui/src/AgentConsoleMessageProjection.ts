import type { AgentMessage } from '@tsdi/agent';
import type { AgentConsoleSessionState } from './AgentConsoleSessionState';
import { projectAgentConsoleArtifactMainline, projectAgentConsoleConversationMainline, projectAgentConsoleDecisionMainline, projectAgentConsoleDiagnosticMainline, projectAgentConsoleExecutionMainline, projectAgentConsoleTimelineDurations } from './AgentConsoleSessionContentPresenter';
import { DEFAULT_TIMELINE_LABELS, TimelineWindowMessage, fillTimelineLabel, formatTimelineClockTime, formatTimelineSessionDuration, isError, truncateTimelineRowText } from './AgentConsoleTimelineWindow';

export function resolveDisplayMessages(state: AgentConsoleSessionState): AgentMessage[] {
        const filtered = projectAgentConsoleConversationMainline(
            projectAgentConsoleTimelineDurations(state.messages.filter(message => isDisplayMessage(state, message)))
        );
        if (state.planMessage) {
            let lastUserIndex = -1;
            for (let index = filtered.length - 1; index >= 0; index--) {
                if (String(filtered[index]?.role || '').toLowerCase() === 'user') {
                    lastUserIndex = index;
                    break;
                }
            }
            if (lastUserIndex >= 0) {
                filtered.splice(lastUserIndex + 1, 0, state.planMessage);
            } else {
                filtered.unshift(state.planMessage);
            }
        }
        if (state.fileChangeMessage) {
            filtered.push(state.fileChangeMessage);
        }
        filtered.push(...state.commandExecutionMessages);
        if (state.timelineMode) {
            const active = state.planTodos.find(todo => todo.status === 'in_progress')
                || state.planTodos.find(todo => todo.status === 'pending');
            if (active) {
                const index = state.planTodos.indexOf(active) + 1;
                filtered.push({
                    id: '__timeline_plan_boundary__',
                    role: 'assistant',
                    content: truncateTimelineRowText(fillTimelineLabel(
                        state.consoleOptions.timelineLabels.boundaryStep || DEFAULT_TIMELINE_LABELS.boundaryStep,
                        {
                            index,
                            total: state.planTodos.length,
                            content: active.content
                        }
                    )),
                    createdAt: Date.now(),
                    metadata: {
                        uiKind: 'timeline-boundary',
                        planIndex: index,
                        planTotal: state.planTodos.length,
                        planStepId: active.id,
                        planStepStatus: active.status,
                        planStepContent: active.content,
                        planStepElapsedMs: typeof active.elapsedMs === 'number' && Number.isFinite(active.elapsedMs)
                            ? active.elapsedMs
                            : undefined
                    }
                } as AgentMessage);
            }
        }
        return projectAgentConsoleExecutionMainline(projectAgentConsoleDiagnosticMainline(
            projectAgentConsoleDecisionMainline(projectAgentConsoleArtifactMainline(filtered))
        ));
    }

export function resolveTimelineSessionStartTime(state: AgentConsoleSessionState): number {
        const created = state.messages
            .map(message => Number(message?.createdAt))
            .filter(ts => Number.isFinite(ts) && ts > 0);
        if (created.length) {
            return Math.min(...created);
        }
        if (state.turnStartedAt > 0) {
            return state.turnStartedAt;
        }
        return Date.now();
    }

export function resolveSessionHeader(state: AgentConsoleSessionState): TimelineWindowMessage | undefined {
        if (!state.timelineMode) {
            return undefined;
        }
        const labels = state.consoleOptions.timelineLabels;
        const start = resolveTimelineSessionStartTime(state);
        const parts: string[] = [];
        const title = String(state.title || '').trim();
        if (title) {
            parts.push(title);
        }
        parts.push(fillTimelineLabel(labels?.headerStart || DEFAULT_TIMELINE_LABELS.headerStart, {
            time: formatTimelineClockTime(start, state.translator)
        }));
        // P302: the turn header carries session context and start time only.
        // Current step position/status lives on the step boundary row, and the
        // error count on the session footer (P303) / event rows — not here.
        return {
            id: '__timeline_session_header__',
            role: 'assistant',
            content: truncateTimelineRowText(parts.join(' · ')),
            createdAt: start,
            metadata: { uiKind: 'timeline-header' }
        };
    }

export function resolveSessionFooter(state: AgentConsoleSessionState): TimelineWindowMessage | undefined {
        if (!state.timelineMode) {
            return undefined;
        }
        const labels = state.consoleOptions.timelineLabels;
        const start = resolveTimelineSessionStartTime(state);
        const running = state.status === 'running' || state.status === 'reasoning';
        const statusWord = state.status === 'error' ? labels?.footerFailed || DEFAULT_TIMELINE_LABELS.footerFailed
            : running ? labels?.footerRunning || DEFAULT_TIMELINE_LABELS.footerRunning
                : labels?.footerDone || DEFAULT_TIMELINE_LABELS.footerDone;
        const end = running ? Date.now() : state.messages.reduce((latest, message) => Math.max(latest, Number(message?.createdAt) || 0), 0) || Date.now();
        const parts: string[] = [statusWord];
        parts.push(fillTimelineLabel(labels?.footerDuration || DEFAULT_TIMELINE_LABELS.footerDuration, {
            duration: formatTimelineSessionDuration(Math.max(0, end - start))
        }));
        const errorCount = state.messages.filter(m => m.metadata?.uiKind === 'event' && isError(m.metadata)).length;
        if (errorCount > 0) {
            parts.push(fillTimelineLabel(labels?.footerErrors || DEFAULT_TIMELINE_LABELS.footerErrors, { count: errorCount }));
        }
        return {
            id: '__timeline_session_footer__',
            role: 'assistant',
            content: truncateTimelineRowText(parts.join(' · ')),
            createdAt: Date.now(),
            metadata: { uiKind: 'timeline-footer' }
        };
    }

export function isDisplayMessage(state: AgentConsoleSessionState, message?: AgentMessage | null): boolean {
        if (!message) {
            return false;
        }
        if (String(message.role || '').toLowerCase() === 'tool') {
            return message.metadata?.type === 'shell';
        }
        if (message.metadata?.uiKind === 'event') {
            const eventType = String(message.metadata?.uiEventType || '').toLowerCase();
            const status = String(message.metadata?.status || '').toLowerCase();
            // Opencode hides routine turn start/completion rows; failures still show.
            if (eventType === 'turn_started'
                || ((eventType === 'turn_completed' || eventType === 'turn') && !['failed', 'error', 'cancelled'].includes(status))) {
                return false;
            }
        }
        if (!state.showThinking && message?.metadata?.uiEventType === 'reasoning') {
            return false;
        }
        if (String(message.role || '').toLowerCase() === 'assistant'
            && Array.isArray(message.metadata?.toolCalls)
            && message.metadata.toolCalls.length
            && (!state.timelineMode || !String(message.content || '').trim())) {
            return false;
        }
        if (String(message.role || '').toLowerCase() === 'assistant'
            && message.metadata?.streaming === true
            && !String(message.content || '').trim()) {
            return false;
        }
        return true;
    }