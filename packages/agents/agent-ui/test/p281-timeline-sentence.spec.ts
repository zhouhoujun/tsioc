import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import {
    formatTimelineSentence,
    resolveTimelineEventSentence,
    TimelineSentenceParts
} from '../src/AgentConsoleTimelineWindow';
import { renderAgentConsoleMessageItems } from '../src/AgentConsoleMessageRenderers';

@Suite('formatTimelineSentence (P281)')
export class FormatTimelineSentenceTest {

    @Test('returns empty string when action is missing')
    testEmptyAction() {
        expect(formatTimelineSentence({ action: '' })).toBe('');
    }

    @Test('action only produces bare verb')
    testActionOnly() {
        expect(formatTimelineSentence({ action: 'Turn cancelled' })).toBe('Turn cancelled');
    }

    @Test('action + object produces action-first sentence')
    testActionObject() {
        expect(formatTimelineSentence({ action: 'Reading', object: 'package.json' })).toBe('Reading package.json');
    }

    @Test('action + object + result')
    testActionObjectResult() {
        expect(formatTimelineSentence({ action: 'Writing', object: 'src/index.ts', result: 'successfully' })).toBe('Writing src/index.ts successfully');
    }

    @Test('action + result without object')
    testActionResult() {
        expect(formatTimelineSentence({ action: 'Completed', result: '(1.2s)' })).toBe('Completed (1.2s)');
    }

    @Test('actor prefix prepended')
    testActorPrefix() {
        expect(formatTimelineSentence({ actor: 'Agent', action: 'Reading', object: 'file.ts' })).toBe('Agent Reading file.ts');
    }

    @Test('detail appended at end')
    testDetailAppended() {
        expect(formatTimelineSentence({ action: 'Running', object: 'tests', detail: '3 suites' })).toBe('Running tests 3 suites');
    }

    @Test('deduplicates consecutive identical words')
    testDeduplication() {
        expect(formatTimelineSentence({ action: 'Completed completed', object: 'step' })).toBe('Completed step');
    }

    @Test('full parts sentence')
    testFullParts() {
        const result = formatTimelineSentence({
            actor: 'Agent',
            action: 'Running',
            object: 'git status',
            result: 'failed: not a git repo',
            detail: '(42ms)'
        });
        expect(result).toBe('Agent Running git status failed: not a git repo (42ms)');
    }
}

@Suite('resolveTimelineEventSentence (P281)')
export class ResolveTimelineEventSentenceTest {

    @Test('returns undefined for non-event messages')
    testNonEvent() {
        expect(resolveTimelineEventSentence({ uiKind: 'message' })).toBeUndefined();
        expect(resolveTimelineEventSentence(undefined)).toBeUndefined();
        expect(resolveTimelineEventSentence({})).toBeUndefined();
    }

    @Test('returns undefined for timeline_summary (no sentence mapping)')
    testTimelineSummary() {
        expect(resolveTimelineEventSentence({
            uiKind: 'event',
            uiEventType: 'timeline_summary'
        })).toBeUndefined();
    }

    @Test('turn_started produces Understanding request')
    testTurnStarted() {
        const result = resolveTimelineEventSentence({
            uiKind: 'event',
            uiEventType: 'turn_started',
            status: 'running'
        });
        expect(result).toBe('Understanding request');
    }

    @Test('turn_cancelled produces Turn cancelled')
    testTurnCancelled() {
        const result = resolveTimelineEventSentence({
            uiKind: 'event',
            uiEventType: 'turn_cancelled',
            status: 'failed'
        });
        expect(result).toBe('Turn cancelled');
    }

    @Test('error event includes error message')
    testError() {
        const result = resolveTimelineEventSentence({
            uiKind: 'event',
            uiEventType: 'error',
            status: 'error',
            error: 'connection refused'
        });
        expect(result).toBe('Error: connection refused');
    }

    @Test('error event falls back to content when no error field')
    testErrorFallback() {
        const result = resolveTimelineEventSentence({
            uiKind: 'event',
            uiEventType: 'error',
            status: 'error'
        }, 'something went wrong');
        expect(result).toBe('Error: something went wrong');
    }

    @Test('tool_invoked uses Running + label')
    testToolInvoked() {
        const result = resolveTimelineEventSentence({
            uiKind: 'event',
            uiEventType: 'tool_invoked',
            status: 'running',
            label: 'read_file'
        });
        expect(result).toBe('Running read_file');
    }

    @Test('tool_succeeded uses Completed + label + duration')
    testToolSucceeded() {
        const result = resolveTimelineEventSentence({
            uiKind: 'event',
            uiEventType: 'tool_succeeded',
            status: 'success',
            label: 'git_operations',
            durationMs: 1234
        });
        expect(result).toBe('Completed git_operations (1.2s)');
    }

    @Test('tool_failed uses Running + label + error')
    testToolFailed() {
        const result = resolveTimelineEventSentence({
            uiKind: 'event',
            uiEventType: 'tool_failed',
            status: 'failed',
            label: 'shell',
            error: 'command not found'
        });
        expect(result).toBe('Running shell failed: command not found');
    }

    @Test('reads uiEventLabel fallback when label is absent')
    testUiEventLabelFallback() {
        const result = resolveTimelineEventSentence({
            uiKind: 'event',
            uiEventType: 'tool_invoked',
            status: 'running',
            uiEventLabel: 'write_file'
        });
        expect(result).toBe('Running write_file');
    }

    @Test('plan_created produces Created plan')
    testPlanCreated() {
        const result = resolveTimelineEventSentence({
            uiKind: 'event',
            uiEventType: 'plan_created',
            status: 'success'
        });
        expect(result).toBe('Created plan');
    }

    @Test('plan_step_started uses content as object')
    testPlanStepStarted() {
        const result = resolveTimelineEventSentence({
            uiKind: 'event',
            uiEventType: 'plan_step_started',
            status: 'running',
            label: 'step-1'
        }, 'Implement P281 formatter');
        expect(result).toBe('Executing step Implement P281 formatter');
    }

    @Test('context_prepared produces Prepared context')
    testContextPrepared() {
        const result = resolveTimelineEventSentence({
            uiKind: 'event',
            uiEventType: 'context_prepared',
            status: 'success',
            durationMs: 50
        });
        expect(result).toBe('Prepared context (50ms)');
    }

    @Test('model_completed produces Model responded')
    testModelCompleted() {
        const result = resolveTimelineEventSentence({
            uiKind: 'event',
            uiEventType: 'model_completed',
            status: 'success'
        });
        expect(result).toBe('Model responded');
    }

    @Test('background_task_started includes task ID')
    testBackgroundTaskStarted() {
        const result = resolveTimelineEventSentence({
            uiKind: 'event',
            uiEventType: 'background_task_started',
            status: 'running',
            taskId: 'bg-42'
        });
        expect(result).toBe('Background task started #bg-42');
    }

    @Test('unknown event type uses generic fallback')
    testGenericFallback() {
        const result = resolveTimelineEventSentence({
            uiKind: 'event',
            uiEventType: 'custom_event',
            status: 'success',
            label: 'my-label'
        });
        expect(result).toBe('Completed my-label');
    }

    @Test('long error is truncated to 80 chars')
    testLongErrorTruncation() {
        const longError = 'A'.repeat(100);
        const result = resolveTimelineEventSentence({
            uiKind: 'event',
            uiEventType: 'tool_failed',
            status: 'failed',
            label: 'shell',
            error: longError
        });
        expect(result!.length).toBeLessThan(longError.length + 30);
        expect(result).toContain('failed:');
    }
}

@Suite('event row content precedence (P281 renderer integration)')
export class EventRowContentPrecedenceTest {

    @Test('content-bearing event rows keep raw content over the sentence')
    testContentWinsOverSentence() {
        const items = renderAgentConsoleMessageItems([{
            id: 'e1', role: 'assistant', content: 'Read src/index.ts', createdAt: 1,
            metadata: { uiKind: 'event', uiEventType: 'tool_completed', status: 'success' }
        }] as any);
        expect(items[0].lines[0].content).toBe('Read src/index.ts');
    }

    @Test('empty-content event rows fall back to the action-first sentence')
    testSentenceFillsEmptyContent() {
        const items = renderAgentConsoleMessageItems([{
            id: 'e2', role: 'assistant', content: '', createdAt: 1,
            metadata: { uiKind: 'event', uiEventType: 'model_completed', status: 'success' }
        }] as any);
        expect(items[0].lines[0].content).toBe('Model responded');
    }

    @Test('long failed rows keep the full body so the cause stays visible')
    testFailedRowsKeepFullContent() {
        const longContent = 'x'.repeat(300);
        const items = renderAgentConsoleMessageItems([{
            id: 'e3', role: 'assistant', content: longContent, createdAt: 1,
            metadata: { uiKind: 'event', uiEventType: 'tool_failed', status: 'error', durationMs: 40 }
        }] as any);
        expect(items[0].lines[0].content).toBe(longContent);
    }
}
