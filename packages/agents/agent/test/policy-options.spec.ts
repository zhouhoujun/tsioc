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

    @Test('merges approval requireApproval and autoReview in default workspace session request order')
    mergesApproval() {
        const policy = resolveAgentPolicy(
            defaultAgentOptions.policy,
            { source: 'workspace', approval: { requireApproval: ['fs.write'], autoReview: true } },
            { source: 'session', approval: { requireApproval: ['sudo.exec', 'deploy'] } },
            { source: 'request', approval: { requireApproval: ['dns.exec'], autoReview: false } }
        );

        expect(policy.source).toEqual('request');
        expect(policy.approval?.requireApproval).toEqual(['dns.exec']);
        expect(policy.approval?.autoReview).toEqual(false);
        expect(policy.limits?.approvalTimeoutMs).toEqual(30000);
    }

    @Test('omits approval when no layer sets it')
    omitsApprovalWhenUnset() {
        const merged = resolveAgentPolicy(defaultAgentOptions.policy, { source: 'workspace', limits: { timelinePageSize: 10 } });

        expect(merged.approval).toBeUndefined();
    }

    @Test('does not mutate source approval requireApproval inputs')
    preservesApprovalInputs() {
        const workspace = { source: 'workspace' as const, approval: { requireApproval: ['fs.write'], autoReview: true } };
        const resolved = resolveAgentPolicy(workspace, { source: 'request', approval: { requireApproval: ['sudo.exec'] } });

        expect(resolved.approval?.requireApproval).toEqual(['sudo.exec']);
        resolved.approval!.requireApproval!.push('deploy');
        expect(workspace.approval.requireApproval).toEqual(['fs.write']);
        expect(workspace.approval.autoReview).toEqual(true);
    }

    @Test('merges retry backoff fields in default workspace session request order')
    mergesRetry() {
        const policy = resolveAgentPolicy(
            defaultAgentOptions.policy,
            { source: 'workspace', retry: { maxRetries: 5 } },
            { source: 'session', retry: { baseDelayMs: 2000 } },
            { source: 'request', retry: { maxDelayMs: 30000, jitterMs: 100 } }
        );

        expect(policy.source).toEqual('request');
        expect(policy.retry).toEqual({ maxRetries: 5, baseDelayMs: 2000, maxDelayMs: 30000, jitterMs: 100 });
        expect(policy.limits?.commandOutputHistoryCap).toEqual(500);
    }

    @Test('omits retry when no layer sets it')
    omitsRetryWhenUnset() {
        const merged = resolveAgentPolicy(defaultAgentOptions.policy, { source: 'workspace', limits: { timelinePageSize: 10 } });

        expect(merged.retry).toBeUndefined();
    }

    @Test('does not mutate source retry inputs')
    preservesRetryInputs() {
        const workspace = { source: 'workspace' as const, retry: { maxRetries: 5, jitterMs: 200 } };
        const resolved = resolveAgentPolicy(workspace, { source: 'request', retry: { maxRetries: 9 } });

        expect(resolved.retry?.maxRetries).toEqual(9);
        resolved.retry!.maxRetries = 2;
        expect(workspace.retry.maxRetries).toEqual(5);
        expect(workspace.retry.jitterMs).toEqual(200);
    }

    @Test('omits new fields when no layer sets them')
    omitsNewFieldsWhenUnset() {
        const merged = resolveAgentPolicy(defaultAgentOptions.policy, { source: 'workspace', limits: { timelinePageSize: 10 } });

        expect(merged.defaultArchetype).toBeUndefined();
        expect(merged.delegationMode).toBeUndefined();
        expect(merged.approval).toBeUndefined();
        expect(merged.retry).toBeUndefined();
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
