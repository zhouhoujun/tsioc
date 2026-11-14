import expect = require('expect');
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { Suite, Test } from '@tsdi/unit';
import { runAgentEvalCompare } from '../src/eval-command';

@Suite('eval compare')
export class EvalCompareTest {
    @Test('passes stable metrics and fails regressions')
    compares() {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'eval-compare-'));
        const baseline = path.join(dir, 'baseline.json');
        const current = path.join(dir, 'current.json');
        try {
            fs.writeFileSync(baseline, JSON.stringify({ metrics: { userMessages: 1, assistantMessages: 1, toolCalls: 10, toolFailures: 0, turns: 1, durationMs: 100, totalTokens: 100 } }));
            fs.writeFileSync(current, JSON.stringify({ userMessages: 1, assistantMessages: 1, toolCalls: 10, toolFailures: 0, turns: 1, durationMs: 120, totalTokens: 110 }));
            expect(runAgentEvalCompare({ baseline, current })).toEqual(true);

            fs.writeFileSync(current, JSON.stringify({ userMessages: 1, assistantMessages: 1, toolCalls: 10, toolFailures: 6, turns: 1, durationMs: 5000, totalTokens: 900 }));
            expect(runAgentEvalCompare({ baseline, current })).toEqual(false);
        } finally {
            fs.rmSync(dir, { recursive: true, force: true });
        }
    }
}
