import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { AgentConsoleSessionService } from '../src';

/**
 * The gateway registers `background_task.list|get|cancel`, but the console
 * service called `background.list`/`background.cancel`, so `/harness list` and
 * `/harness tree` failed with "Method 'background.list' not found".
 */
@Suite('background task RPC names match the gateway')
export class BackgroundRpcNamesTest {

    @Test('list and cancel call the canonical background_task methods')
    async canonicalNames() {
        const calls: string[] = [];
        const rpc: any = {
            request: async (method: string) => {
                calls.push(method);
                return method.endsWith('.list') ? { items: [], hasMore: false } : { cancelled: [] };
            }
        };
        const service = new AgentConsoleSessionService(rpc, null);
        await service.listAllBackgroundTasks({ delegationRoot: 'root' });
        await service.cancelBackgroundTasks(['t1']);
        expect(calls).toEqual(['background_task.list', 'background_task.cancel']);
    }
}
