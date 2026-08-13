import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { TokenBudgetTracker } from '../src';

@Suite('Token budget tracker')
export class TokenBudgetTrackerTest {
    @Test('is disabled when no budget is configured')
    disabledByDefault() {
        const tracker = new TokenBudgetTracker();
        expect(tracker.enabled).toBe(false);
        const decision = tracker.evaluate('session', 'session-1');
        expect(decision.exceeded).toBe(false);
        expect(decision.reminderFired).toBe(false);
    }

    @Test('records usage and accumulates per session scope')
    accumulatesPerSession() {
        const tracker = new TokenBudgetTracker({ perSession: 1000 });
        expect(tracker.enabled).toBe(true);
        tracker.recordUsage('session-1', undefined, { promptTokens: 100, completionTokens: 50 });
        tracker.recordUsage('session-1', undefined, { totalTokens: 300 });
        expect(tracker.usedFor('session', 'session-1')).toBe(450);
        const decision = tracker.evaluate('session', 'session-1');
        expect(decision.state.budget).toBe(1000);
        expect(decision.state.used).toBe(450);
        expect(decision.state.remaining).toBe(550);
        expect(decision.state.exhausted).toBe(false);
        expect(decision.exceeded).toBe(false);
    }

    @Test('tracks thread scope independently from session scope')
    perThreadScope() {
        const tracker = new TokenBudgetTracker({ perThread: 500 });
        tracker.recordUsage('session-1', 'thread-a', { totalTokens: 400 });
        tracker.recordUsage('session-2', 'thread-a', { totalTokens: 200 });
        expect(tracker.usedFor('thread', 'thread-a')).toBe(600);
        expect(tracker.evaluate('thread', 'thread-a').exceeded).toBe(true);
        expect(tracker.evaluate('thread', 'thread-b').exceeded).toBe(false);
    }

    @Test('normalizes usage key shapes (snake_case and camelCase)')
    normalizesUsageKeys() {
        const tracker = new TokenBudgetTracker({ perSession: 100 });
        tracker.recordUsage('session-1', undefined, { prompt_tokens: 10, completion_tokens: 5 });
        tracker.recordUsage('session-1', undefined, { input_tokens: 10, output_tokens: 5 });
        expect(tracker.usedFor('session', 'session-1')).toBe(30);
        tracker.recordUsage('session-1', undefined, {});
        expect(tracker.usedFor('session', 'session-1')).toBe(30);
    }

    @Test('fires reminder when remaining fraction crosses thresholds')
    reminderThresholds() {
        const tracker = new TokenBudgetTracker({ perSession: 1000, reminders: [0.5, 0.2] });
        tracker.recordUsage('session-1', undefined, { totalTokens: 400 });
        const above = tracker.evaluate('session', 'session-1');
        expect(above.reminderFired).toBe(false);
        tracker.recordUsage('session-1', undefined, { totalTokens: 350 });
        const atThreshold = tracker.evaluate('session', 'session-1');
        expect(atThreshold.reminderFired).toBe(true);
        tracker.recordUsage('session-1', undefined, { totalTokens: 100 });
        const below = tracker.evaluate('session', 'session-1');
        expect(below.reminderFired).toBe(true);
        expect(below.exceeded).toBe(false);
    }

    @Test('no reminder above highest threshold')
    noReminderAboveThreshold() {
        const tracker = new TokenBudgetTracker({ perSession: 1000, reminders: [0.5] });
        tracker.recordUsage('session-1', undefined, { totalTokens: 400 });
        expect(tracker.evaluate('session', 'session-1').reminderFired).toBe(false);
    }

    @Test('flags exceeded when usage reaches the cap')
    exceededAtCap() {
        const tracker = new TokenBudgetTracker({ perSession: 500 });
        tracker.recordUsage('session-1', undefined, { totalTokens: 500 });
        const decision = tracker.evaluate('session', 'session-1');
        expect(decision.exceeded).toBe(true);
        expect(decision.state.remaining).toBe(0);
        expect(decision.state.exhausted).toBe(true);
        expect(decision.reminderFired).toBe(false);
    }

    @Test('reset clears a scope')
    resetScope() {
        const tracker = new TokenBudgetTracker({ perSession: 1000 });
        tracker.recordUsage('session-1', undefined, { totalTokens: 400 });
        tracker.reset('session-1');
        expect(tracker.usedFor('session', 'session-1')).toBe(0);
    }
}
