import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { InMemoryCommandExecutionControl } from '@tsdi/agent';
import { AgentConsoleSessionState } from '../src';

@Suite('console notice lifecycle')
export class ConsoleNoticeLifecycleTest {
    @Test('starting a turn clears the previous command notice')
    clearsNoticeWhenTurnStarts() {
        const state = new AgentConsoleSessionState(new InMemoryCommandExecutionControl());
        state.setStatus('idle');
        state.setNotice('Switched model profile to deepseek-fast.');
        state.setStatus('running');
        expect(state.notice).toEqual('');
    }
}
