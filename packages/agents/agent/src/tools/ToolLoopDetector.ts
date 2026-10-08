import { Injectable } from '@tsdi/ioc';
import { LOOP_NO_PROGRESS_REPEATS, LOOP_PINGPONG_CYCLES, LOOP_REPEAT_BREAK, LOOP_REPEAT_WARNING } from '../AgentLimits';

export interface LoopDetectionResult {
    detected: boolean;
    severity: 'warning' | 'block' | 'break';
    reason?: string;
}

interface CallSignature {
    name: string;
    argsHash: string;
    resultHash?: string;
}

/**
 * Detects tool call loops — exact repeats, ping-pong, and no-progress patterns.
 *
 * Reference: zeroclaw crates/zeroclaw-runtime/src/agent/loop_detector.rs
 */
@Injectable()
export class ToolLoopDetector {
    private history: CallSignature[] = [];

    /** Reset detector for a new turn */
    reset(): void {
        this.history = [];
    }

    /**
     * Record a tool call and its result, then check for loop patterns.
     */
    record(name: string, input: any, output?: any): LoopDetectionResult {
        const sig: CallSignature = {
            name,
            argsHash: this.hash(input)
        };
        if (output !== undefined) {
            sig.resultHash = this.hash(output);
        }
        this.history.push(sig);

        return this.detect();
    }

    private detect(): LoopDetectionResult {
        const h = this.history;
        if (h.length < LOOP_REPEAT_WARNING) return { detected: false, severity: 'warning' };

        // 1. Exact repeat: same tool + same args 3+ times
        const last3 = h.slice(-LOOP_REPEAT_WARNING);
        if (last3.every(s => s.name === last3[0].name && s.argsHash === last3[0].argsHash)) {
            if (h.length >= LOOP_REPEAT_BREAK) {
                const last5 = h.slice(-LOOP_REPEAT_BREAK);
                if (last5.every(s => s.name === last5[0].name && s.argsHash === last5[0].argsHash)) {
                    return { detected: true, severity: 'break', reason: `Tool "${last3[0].name}" repeated 5 times with identical arguments.` };
                }
                return { detected: true, severity: 'block', reason: `Tool "${last3[0].name}" repeated 3+ times with identical arguments.` };
            }
            return { detected: true, severity: 'warning', reason: `Tool "${last3[0].name}" repeating with same arguments.` };
        }

        // 2. Ping-pong: A→B→A→B for 4+ cycles
        if (h.length >= LOOP_PINGPONG_CYCLES) {
            const last4 = h.slice(-LOOP_PINGPONG_CYCLES);
            if (last4[0].name === last4[2].name && last4[1].name === last4[3].name && last4[0].name !== last4[1].name) {
                return { detected: true, severity: 'block', reason: `Ping-pong detected: "${last4[0].name}" ↔ "${last4[1].name}".` };
            }
        }

        // 3. No progress: same tool + same result hash 4+ times
        if (h.length >= LOOP_NO_PROGRESS_REPEATS) {
            const last4 = h.slice(-LOOP_NO_PROGRESS_REPEATS);
            if (last4.every(s => s.name === last4[0].name && s.resultHash && s.resultHash === last4[0].resultHash)) {
                return { detected: true, severity: 'break', reason: `No progress: "${last4[0].name}" returned identical result ${h.length} times.` };
            }
        }

        return { detected: false, severity: 'warning' };
    }

    private hash(value: any): string {
        try {
            const str = typeof value === 'string' ? value : JSON.stringify(value);
            let hash = 0;
            for (let i = 0; i < str.length; i++) {
                const char = str.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash;
            }
            return hash.toString(36);
        } catch {
            return String(Math.random());
        }
    }
}
