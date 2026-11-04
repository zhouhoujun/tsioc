import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { OutputGuard } from '../src/harness/OutputGuard';

@Suite('output guard redaction')
export class OutputGuardRedactionTest {
    @Test('does not redact ordinary words containing sk-')
    keepsOrdinaryPaths() {
        const guard = new OutputGuard();
        expect(guard.redact('task-system/src/task.js')).toEqual('task-system/src/task.js');
        expect(guard.redact('risk-system')).toEqual('risk-system');
    }

    @Test('still redacts real API keys')
    redactsKeys() {
        const guard = new OutputGuard();
        expect(guard.redact('sk-abcdefghijklmnopqrstuvwxyz123456')).toEqual('[REDACTED]');
    }
}
