import { AgentMessage } from '@tsdi/agent';

export type FullSessionBranch = 'normal' | 'blocked' | 'failed' | 'cancelled' | 'replay';

function message(id: string, role: string, content: string, metadata: Record<string, any> = {}, parts?: any[]): AgentMessage {
    return { id, role, content, createdAt: Date.UTC(2026, 0, 15, 8, 0, 0), metadata, parts } as AgentMessage;
}

/** Shared pure fixture for the complete content-composition acceptance matrix. */
export function buildFullSessionFixture(branch: FullSessionBranch): AgentMessage[] {
    const terminalStatus = branch === 'cancelled' ? 'cancelled' : branch === 'failed' ? 'error' : 'success';
    const messages = [
        message('user-1', 'user', '修复会话恢复并验证 **跨端渲染**'),
        message('plan-1', 'assistant', 'plan 1/3\n1. [in_progress] 修复状态恢复', {
            uiKind: 'plan-todo', planId: 'plan-1', planRevision: 2
        }),
        message('thought-1', 'assistant', 'Inspecting restore state and event ownership', {
            uiKind: 'event', uiEventType: 'reasoning', status: 'completed', detailRef: 'thought-detail'
        }),
        message('tool-1', 'assistant', 'Read session state', {
            uiKind: 'event', uiEventType: 'tool_completed', status: 'success', timeline: { toolCallId: 'tool-1' }, detailRef: 'tool-detail'
        }),
        message('command-1', 'assistant', 'raw stdout must not enter mainline', {
            uiKind: 'command-execution', command: 'npm', args: 'test', status: terminalStatus, outputIds: ['output-1'],
            error: branch === 'failed' ? 'restore test failed' : undefined
        }),
        message('question-event', 'assistant', 'Question requested', {
            uiKind: 'event', uiEventType: 'ask_user', questionId: 'q1'
        }),
        message('question-1', 'assistant', 'Use persisted state?', {
            uiKind: 'question', questionId: 'q1', question: 'Use persisted state?', status: branch === 'blocked' ? 'pending' : 'answered',
            answer: branch === 'blocked' ? undefined : 'Yes'
        }),
        message('approval-1', 'assistant', 'Write session index', {
            uiKind: 'approval', approvalId: 'a1', summary: 'Write session index', risk: 'workspace write', scope: 'once',
            status: branch === 'blocked' ? 'pending' : 'approved', decision: branch === 'blocked' ? undefined : 'allow'
        }),
        message('files-1', 'assistant', 'files changed: 1\nsrc/session.ts [update] (+4 -1)', {
            uiKind: 'file-change', planStepId: 'step-1', detailRef: 'review-1'
        }),
        message('attachment-1', 'assistant', '', { planStepId: 'step-1' }, [
            { type: 'file', name: 'restore-report.txt', dataUrl: 'data:text/plain,ok' }
        ]),
        message('warning-1', 'assistant', 'retrying restore', { warning: true, causalKey: 'restore:1' }),
        message('diagnostic-1', 'assistant', branch === 'failed' ? '恢复索引写入失败：权限不足' : 'Restore completed', {
            error: branch === 'failed', status: branch === 'failed' ? 'error' : terminalStatus,
            causalKey: 'restore:1', rootCause: branch === 'failed' ? '恢复索引写入失败：权限不足' : undefined,
            stack: branch === 'failed' ? 'full stack in inspector' : undefined
        }),
        message('background-start', 'assistant', 'started', {
            uiKind: 'event', uiEventType: 'background_task_started', taskId: 'bg-1', owner: 'worker-a', goal: 'Verify restore'
        }),
        message('background-end', 'assistant', 'finished', {
            uiKind: 'event', uiEventType: branch === 'failed' ? 'background_task_failed' : 'background_task_completed',
            taskId: 'bg-1', owner: 'worker-a', goal: 'Verify restore',
            summary: branch === 'failed' ? undefined : 'all checks passed', error: branch === 'failed' ? 'verification failed' : undefined
        }),
        message('final-1', 'assistant', '## Result\n\nSession restore is complete.\n\n```ts\nrestore();\n```')
    ];
    if (branch === 'replay') {
        messages.splice(2, 0, message('plan-old', 'assistant', 'old plan', { uiKind: 'plan-todo', planId: 'plan-1', planRevision: 1 }));
        messages.push(message('final-replay', 'assistant', messages[messages.length - 1].content));
    }
    return messages;
}
