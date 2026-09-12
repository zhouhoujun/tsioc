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

    @Test('merges defaultArchetype in default workspace session request order')
    mergesDefaultArchetype() {
        const policy = resolveAgentPolicy(
            defaultAgentOptions.policy,
            { source: 'workspace', defaultArchetype: 'review' },
            { source: 'session', defaultArchetype: 'plan' },
            { source: 'request', defaultArchetype: 'coder' }
        );

        expect(policy.defaultArchetype).toEqual('coder');
        expect(policy.source).toEqual('request');
        expect(policy.limits?.commandOutputHistoryCap).toEqual(500);
    }

    @Test('merges delegationMode in default workspace session request order')
    mergesDelegationMode() {
        const policy = resolveAgentPolicy(
            defaultAgentOptions.policy,
            { source: 'workspace', delegationMode: 'proactive' },
            { source: 'session', delegationMode: 'disabled' },
            { source: 'request', delegationMode: 'explicit' }
        );

        expect(policy.delegationMode).toEqual('explicit');
        expect(policy.source).toEqual('request');
    }

    @Test('merges verification writeTools in default workspace session request order')
    mergesVerificationWriteTools() {
        const policy = resolveAgentPolicy(
            defaultAgentOptions.policy,
            { source: 'workspace', verification: { writeTools: ['edit_file'] } },
            { source: 'session', verification: { writeTools: ['apply_patch', 'delete_file'] } },
            { source: 'request', verification: { writeTools: ['write_file'] } }
        );

        expect(policy.source).toEqual('request');
        expect(policy.verification?.writeTools).toEqual(['write_file']);
        expect(policy.limits?.commandOutputHistoryCap).toEqual(500);
    }

    @Test('omits verification when no layer sets writeTools')
    omitsVerificationWhenUnset() {
        const merged = resolveAgentPolicy(defaultAgentOptions.policy, { source: 'workspace', limits: { timelinePageSize: 10 } });

        expect(merged.verification).toBeUndefined();
    }

    @Test('does not mutate source verification writeTools inputs')
    preservesVerificationWriteToolsInputs() {
        const workspace = { source: 'workspace' as const, verification: { writeTools: ['edit_file'] } };
        const resolved = resolveAgentPolicy(workspace, { source: 'request', verification: { writeTools: ['write_file'] } });

        expect(resolved.verification?.writeTools).toEqual(['write_file']);
        resolved.verification!.writeTools!.push('mkdir');
        expect(workspace.verification.writeTools).toEqual(['edit_file']);
    }

    @Test('omits new fields when no layer sets them')
    omitsNewFieldsWhenUnset() {
        const merged = resolveAgentPolicy(defaultAgentOptions.policy, { source: 'workspace', limits: { timelinePageSize: 10 } });

        expect(merged.defaultArchetype).toBeUndefined();
        expect(merged.delegationMode).toBeUndefined();
        expect(merged.limits?.timelinePageSize).toEqual(10);
    }

    @Test('does not mutate source defaultArchetype or delegationMode')
    preservesNewFieldInputs() {
        const workspace = { source: 'workspace' as const, defaultArchetype: 'review', delegationMode: 'proactive' as const };
        const resolved = resolveAgentPolicy(workspace, { source: 'request', defaultArchetype: 'coder' });

        expect(resolved.defaultArchetype).toEqual('coder');
        resolved.defaultArchetype = 'plan';
        expect(workspace.defaultArchetype).toEqual('review');
        expect(workspace.delegationMode).toEqual('proactive');
    }
}
