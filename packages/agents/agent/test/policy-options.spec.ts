import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { defaultAgentOptions, resolveAgentPolicy } from '../src/options';

@Suite('Agent policy options')
export class AgentPolicyOptionsTest {
    @Test('merges limits in default workspace session request order')
    mergesPolicyLimits() {
        const policy = resolveAgentPolicy(
            defaultAgentOptions.policy,
            { source: 'workspace', limits: { timelinePageSize: 25 } },
            { source: 'session', limits: { approvalTimeoutMs: 1000 } },
            { source: 'request', limits: { timelinePageSize: 5 } }
        );

        expect(policy.source).toEqual('request');
        expect(policy.limits?.commandOutputHistoryCap).toEqual(500);
        expect(policy.limits?.approvalTimeoutMs).toEqual(1000);
        expect(policy.limits?.timelinePageSize).toEqual(5);
    }

    @Test('does not mutate source policies')
    preservesInputs() {
        const workspace = { source: 'workspace' as const, limits: { commandOutputPageSize: 12 } };
        const resolved = resolveAgentPolicy(workspace, { limits: { rpcTimeoutMs: 900 } });

        resolved.limits!.commandOutputPageSize = 3;
        expect(workspace.limits.commandOutputPageSize).toEqual(12);
        expect(resolved.limits?.rpcTimeoutMs).toEqual(900);
    }
}
