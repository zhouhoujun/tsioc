import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { Application, ApplicationContext } from '@tsdi/core';
import { AgentRuntime } from '../src/runtime/AgentRuntime';
import { DefaultAgentRuntime } from '../src/runtime/DefaultAgentRuntime';
import { ToolRegistry } from '../src/tools/ToolRegistry';
import { EchoModelAdapter } from '../src/model/EchoModelAdapter';
import { ModelAdapter } from '../src/model/ModelAdapter';
import { SimpleSessionSummarizer } from '../src/memory/SimpleSessionSummarizer';
import { SessionSummarizer } from '../src/memory/SessionSummarizer';
import { AgentOptions, DEFAULT_APPROVAL_REQUIRED_RULES, defaultAgentOptions, resolveAgentPolicy } from '../src/options';
import { DEFAULT_VERIFICATION_WRITE_TOOLS } from '../src/harness/VerificationGate';
import { AGENT_OPTIONS } from '../src/tokens';
import { AgentModule } from '../src/agent.module';
import { provideAgentOrm } from '../src/orm.module';

class EmptyToolRegistry extends ToolRegistry {
    getTools() { return []; }
    getTool() { return undefined; }
    async invoke(): Promise<any> { return null; }
}

async function createRuntime(options: AgentOptions = defaultAgentOptions): Promise<{ runtime: DefaultAgentRuntime; ctx: ApplicationContext }> {
    const providers: any[] = [...provideAgentOrm({ type: 'sqljs' as any, autoLoadEntities: false as any, synchronize: true, autoSave: false, entities: [] } as any),
        { provide: ModelAdapter, useValue: new EchoModelAdapter() },
        { provide: ToolRegistry, useValue: new EmptyToolRegistry() },
        { provide: SessionSummarizer, useValue: new SimpleSessionSummarizer() },
        { provide: AGENT_OPTIONS, useValue: options }];
    const ctx = await Application.run(AgentModule, { providers });
    return { runtime: ctx.get(AgentRuntime) as DefaultAgentRuntime, ctx };
}

@Suite('Agent policy source chain')
export class AgentPolicySourceChainTest {
    @Test('default layer: schema defaults resolve with source default')
    async defaultSource() {
        const { runtime, ctx } = await createRuntime();
        try {
            expect(runtime.resolveSessionArchetype('s1')).toEqual({ value: 'build', source: 'default' });
            expect(runtime.resolveSessionDelegationMode('s1')).toEqual({ value: 'explicit', source: 'default' });
        } finally { await ctx.close(); }
    }

    @Test('workspace layer: policy defaultArchetype and delegationMode win with source workspace')
    async workspacePolicyWins() {
        const options: AgentOptions = {
            ...defaultAgentOptions,
            policy: resolveAgentPolicy(defaultAgentOptions.policy, { source: 'workspace', defaultArchetype: 'review', delegationMode: 'proactive' })
        };
        const { runtime, ctx } = await createRuntime(options);
        try {
            expect(runtime.resolveSessionArchetype('s1')).toEqual({ value: 'review', source: 'workspace' });
            expect(runtime.resolveSessionDelegationMode('s1')).toEqual({ value: 'proactive', source: 'workspace' });
            expect(runtime.getSessionArchetype('s1')).toEqual('review');
            expect(runtime.getSessionDelegationMode('s1')).toEqual('proactive');
        } finally { await ctx.close(); }
    }

    @Test('legacy top-level aliases still work, labeled workspace when divergent from schema default')
    async legacyAliasDivergent() {
        const options: AgentOptions = {
            ...defaultAgentOptions,
            defaultArchetype: 'review',
            delegationMode: 'proactive'
        };
        const { runtime, ctx } = await createRuntime(options);
        try {
            expect(runtime.resolveSessionArchetype('s1')).toEqual({ value: 'review', source: 'workspace' });
            expect(runtime.resolveSessionDelegationMode('s1')).toEqual({ value: 'proactive', source: 'workspace' });
        } finally { await ctx.close(); }
    }

    @Test('session layer: explicit session override beats policy with source session')
    async sessionBeatsPolicy() {
        const options: AgentOptions = {
            ...defaultAgentOptions,
            policy: resolveAgentPolicy(defaultAgentOptions.policy, { source: 'workspace', defaultArchetype: 'review', delegationMode: 'proactive' })
        };
        const { runtime, ctx } = await createRuntime(options);
        try {
            runtime.setSessionArchetype('s1', 'plan');
            expect(runtime.resolveSessionArchetype('s1')).toEqual({ value: 'plan', source: 'session' });
            expect(runtime.resolveSessionArchetype('s2')).toEqual({ value: 'review', source: 'workspace' });

            runtime.setSessionDelegationMode('s1', 'disabled');
            expect(runtime.resolveSessionDelegationMode('s1')).toEqual({ value: 'disabled', source: 'session' });
            expect(runtime.resolveSessionDelegationMode('s2')).toEqual({ value: 'proactive', source: 'workspace' });
        } finally { await ctx.close(); }
    }

    @Test('default layer: schema verification write tools resolve with source default')
    async verificationDefaultSource() {
        const { runtime, ctx } = await createRuntime();
        try {
            expect(runtime.resolveVerificationWriteTools()).toEqual({ value: DEFAULT_VERIFICATION_WRITE_TOOLS, source: 'default' });
        } finally { await ctx.close(); }
    }

    @Test('workspace layer: policy verification writeTools win with source workspace')
    async verificationWorkspacePolicyWins() {
        const options: AgentOptions = {
            ...defaultAgentOptions,
            policy: resolveAgentPolicy(defaultAgentOptions.policy, { source: 'workspace', verification: { writeTools: ['edit_file'] } })
        };
        const { runtime, ctx } = await createRuntime(options);
        try {
            expect(runtime.resolveVerificationWriteTools()).toEqual({ value: ['edit_file'], source: 'workspace' });
        } finally { await ctx.close(); }
    }

    @Test('legacy top-level verificationWriteTools still work, labeled workspace when divergent from schema default')
    async verificationLegacyAliasDivergent() {
        const options: AgentOptions = {
            ...defaultAgentOptions,
            verificationWriteTools: ['edit_file', 'apply_patch']
        };
        const { runtime, ctx } = await createRuntime(options);
        try {
            expect(runtime.resolveVerificationWriteTools()).toEqual({ value: ['edit_file', 'apply_patch'], source: 'workspace' });
        } finally { await ctx.close(); }
    }

    @Test('legacy verificationWriteTools equal to schema default resolve with source default')
    async verificationLegacyAliasEqualToDefault() {
        const options: AgentOptions = {
            ...defaultAgentOptions,
            verificationWriteTools: [...DEFAULT_VERIFICATION_WRITE_TOOLS]
        };
        const { runtime, ctx } = await createRuntime(options);
        try {
            expect(runtime.resolveVerificationWriteTools()).toEqual({ value: DEFAULT_VERIFICATION_WRITE_TOOLS, source: 'default' });
        } finally { await ctx.close(); }
    }

    @Test('request layer: request verification writeTools win with source request')
    async verificationRequestLayerWins() {
        const options: AgentOptions = {
            ...defaultAgentOptions,
            policy: resolveAgentPolicy(
                defaultAgentOptions.policy,
                { source: 'workspace', verification: { writeTools: ['edit_file'] } },
                { source: 'request', verification: { writeTools: ['write_file', 'delete_file'] } }
            )
        };
        const { runtime, ctx } = await createRuntime(options);
        try {
            expect(runtime.resolveVerificationWriteTools()).toEqual({ value: ['write_file', 'delete_file'], source: 'request' });
        } finally { await ctx.close(); }
    }

    @Test('default layer: schema approval rules resolve with source default')
    async approvalDefaultSource() {
        const { runtime, ctx } = await createRuntime();
        try {
            expect(runtime.resolveApprovalRequired()).toEqual({ value: DEFAULT_APPROVAL_REQUIRED_RULES, source: 'default' });
            expect(runtime.resolveApprovalAutoReview()).toEqual({ value: false, source: 'default' });
        } finally { await ctx.close(); }
    }

    @Test('workspace layer: policy approval requireApproval wins with source workspace')
    async approvalWorkspacePolicyWins() {
        const options: AgentOptions = {
            ...defaultAgentOptions,
            policy: resolveAgentPolicy(defaultAgentOptions.policy, { source: 'workspace', approval: { requireApproval: ['fs.write'], autoReview: true } })
        };
        const { runtime, ctx } = await createRuntime(options);
        try {
            expect(runtime.resolveApprovalRequired()).toEqual({ value: ['fs.write'], source: 'workspace' });
            expect(runtime.resolveApprovalAutoReview()).toEqual({ value: true, source: 'workspace' });
        } finally { await ctx.close(); }
    }

    @Test('legacy tools.requireApproval still work, labeled workspace when divergent from schema default')
    async approvalLegacyAliasDivergent() {
        const options: AgentOptions = {
            ...defaultAgentOptions,
            tools: { ...defaultAgentOptions.tools, requireApproval: ['fs.write', 'deploy'] }
        };
        const { runtime, ctx } = await createRuntime(options);
        try {
            expect(runtime.resolveApprovalRequired()).toEqual({ value: ['fs.write', 'deploy'], source: 'workspace' });
        } finally { await ctx.close(); }
    }

    @Test('legacy tools.requireApproval equal to schema default resolve with source default')
    async approvalLegacyAliasEqualToDefault() {
        const options: AgentOptions = {
            ...defaultAgentOptions,
            tools: { ...defaultAgentOptions.tools, requireApproval: [...DEFAULT_APPROVAL_REQUIRED_RULES] }
        };
        const { runtime, ctx } = await createRuntime(options);
        try {
            expect(runtime.resolveApprovalRequired()).toEqual({ value: DEFAULT_APPROVAL_REQUIRED_RULES, source: 'default' });
        } finally { await ctx.close(); }
    }

    @Test('legacy tools.approvalAutoReview false resolves as default, true as workspace')
    async approvalLegacyAutoReviewLabeling() {
        const options: AgentOptions = {
            ...defaultAgentOptions,
            tools: { ...defaultAgentOptions.tools, approvalAutoReview: true }
        };
        const { runtime, ctx } = await createRuntime(options);
        try {
            expect(runtime.resolveApprovalAutoReview()).toEqual({ value: true, source: 'workspace' });
        } finally { await ctx.close(); }
    }

    @Test('request layer: request approval of policy wins with source request')
    async approvalRequestLayerWins() {
        const options: AgentOptions = {
            ...defaultAgentOptions,
            policy: resolveAgentPolicy(
                defaultAgentOptions.policy,
                { source: 'workspace', approval: { requireApproval: ['fs.write'] } },
                { source: 'request', approval: { requireApproval: ['sudo.exec', 'deploy'], autoReview: false } }
            )
        };
        const { runtime, ctx } = await createRuntime(options);
        try {
            expect(runtime.resolveApprovalRequired()).toEqual({ value: ['sudo.exec', 'deploy'], source: 'request' });
            expect(runtime.resolveApprovalAutoReview()).toEqual({ value: false, source: 'request' });
        } finally { await ctx.close(); }
    }

    @Test('request layer: request layer of policy wins with source request')
    async requestLayerWins() {
        const options: AgentOptions = {
            ...defaultAgentOptions,
            policy: resolveAgentPolicy(
                defaultAgentOptions.policy,
                { source: 'workspace', defaultArchetype: 'review', delegationMode: 'proactive' },
                { source: 'session', defaultArchetype: 'plan', delegationMode: 'disabled' },
                { source: 'request', defaultArchetype: 'coder', delegationMode: 'explicit' }
            )
        };
        const { runtime, ctx } = await createRuntime(options);
        try {
            expect(runtime.resolveSessionArchetype('s1')).toEqual({ value: 'coder', source: 'request' });
            expect(runtime.resolveSessionDelegationMode('s1')).toEqual({ value: 'explicit', source: 'request' });
        } finally { await ctx.close(); }
    }

    @Test('invalid policy delegationMode falls through to lower layers')
    async invalidPolicyDelegationFallsThrough() {
        const options: AgentOptions = {
            ...defaultAgentOptions,
            policy: resolveAgentPolicy(defaultAgentOptions.policy, { source: 'workspace', delegationMode: 'aggressive' as any })
        };
        const { runtime, ctx } = await createRuntime(options);
        try {
            expect(runtime.resolveSessionDelegationMode('s1')).toEqual({ value: 'explicit', source: 'default' });
        } finally { await ctx.close(); }
    }

    @Test('setPlanMode(false) restores the policy default archetype, not the schema constant')
    async planModeOffRestoresPolicyDefault() {
        const options: AgentOptions = {
            ...defaultAgentOptions,
            policy: resolveAgentPolicy(defaultAgentOptions.policy, { source: 'workspace', defaultArchetype: 'review' })
        };
        const { runtime, ctx } = await createRuntime(options);
        try {
            runtime.setPlanMode('s1', true);
            expect(runtime.getSessionArchetype('s1')).toEqual('plan');

            runtime.setPlanMode('s1', false);
            expect(runtime.getSessionArchetype('s1')).toEqual('review');
        } finally { await ctx.close(); }
    }

    @Test('setSessionArchetype(sessionId, null) restores the policy default archetype')
    async sessionArchetypeNullRestoresPolicyDefault() {
        const options: AgentOptions = {
            ...defaultAgentOptions,
            policy: resolveAgentPolicy(defaultAgentOptions.policy, { source: 'workspace', defaultArchetype: 'review' })
        };
        const { runtime, ctx } = await createRuntime(options);
        try {
            runtime.setSessionArchetype('s1', 'plan');
            runtime.setSessionArchetype('s1', null);
            expect(runtime.getSessionArchetype('s1')).toEqual('review');
        } finally { await ctx.close(); }
    }
}