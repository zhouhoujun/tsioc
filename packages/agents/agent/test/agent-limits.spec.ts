import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import {
    CONTEXT_ADAPTIVE_MIN_HISTORY,
    CONTEXT_ADAPTIVE_WINDOW,
    CONTEXT_HIGH_GROWTH_TOKENS,
    CONTEXT_LOW_GROWTH_TOKENS,
    CONTEXT_SESSION_STORE_MAX,
    CONTEXT_TOKEN_HISTORY_MAX,
    EMPTY_RESPONSE_MAX_RETRIES,
    FALSIFICATION_ESCALATION_THRESHOLD,
    LOOP_NO_PROGRESS_REPEATS,
    LOOP_PINGPONG_CYCLES,
    LOOP_REPEAT_BREAK,
    LOOP_REPEAT_WARNING,
    SCHEDULER_DEFAULT_SHUTDOWN_TIMEOUT_MS,
    TURN_DIAGNOSTICS_LIMIT,
    TURN_DIAGNOSTICS_RECENT_ATTEMPTS,
    ToolLoopDetector,
    defaultAgentOptions
} from '../src';

@Suite('Agent runtime limits')
export class AgentLimitsSpec {
    @Test('schema default reuses the scheduler shutdown constant')
    schedulerUsesConstant() {
        expect(SCHEDULER_DEFAULT_SHUTDOWN_TIMEOUT_MS).toBe(10000);
        expect(defaultAgentOptions.scheduler?.shutdownTimeoutMs).toBe(SCHEDULER_DEFAULT_SHUTDOWN_TIMEOUT_MS);
    }

    @Test('loop detector thresholds are named and behavior is unchanged')
    loopDetectorThresholds() {
        expect(LOOP_REPEAT_WARNING).toBe(3);
        expect(LOOP_REPEAT_BREAK).toBe(5);
        expect(LOOP_PINGPONG_CYCLES).toBe(4);
        expect(LOOP_NO_PROGRESS_REPEATS).toBe(4);

        const detector = new ToolLoopDetector();
        const record = () => detector.record('read', { path: 'a' });
        expect(record().detected).toBe(false);
        expect(record().detected).toBe(false);
        const third = record();
        expect(third.detected).toBe(true);
        expect(third.severity).toBe('warning');
        record();
        const fifth = record();
        expect(fifth.detected).toBe(true);
        expect(fifth.severity).toBe('break');
    }

    @Test('runtime and context thresholds keep their defaults')
    constantDefaults() {
        expect(EMPTY_RESPONSE_MAX_RETRIES).toBe(2);
        expect(FALSIFICATION_ESCALATION_THRESHOLD).toBe(2);
        expect(TURN_DIAGNOSTICS_LIMIT).toBe(50);
        expect(TURN_DIAGNOSTICS_RECENT_ATTEMPTS).toBe(8);
        expect(CONTEXT_SESSION_STORE_MAX).toBe(20);
        expect(CONTEXT_TOKEN_HISTORY_MAX).toBe(20);
        expect(CONTEXT_ADAPTIVE_WINDOW).toBe(6);
        expect(CONTEXT_ADAPTIVE_MIN_HISTORY).toBe(4);
        expect(CONTEXT_HIGH_GROWTH_TOKENS).toBe(5000);
        expect(CONTEXT_LOW_GROWTH_TOKENS).toBe(1000);
    }
}
