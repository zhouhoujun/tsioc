import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { Application } from '@tsdi/core';
import { AgentModule } from '../src/agent.module';
import { provideAgentOrm } from '../src/orm.module';
import { AGENT_OPTIONS } from '../src/tokens';
import { defaultAgentOptions } from '../src/options';
import { AgentRuntime } from '../src/runtime/AgentRuntime';
import { ApprovalDecision, ApprovalManager } from '../src/tools/ToolApprovalManager';

async function buildApp(requireApproval: string[]) {
    return Application.run(AgentModule, {
        providers: [
            ...provideAgentOrm({
                type: 'sqljs' as any,
                autoLoadEntities: false as any,
                synchronize: true,
                autoSave: false,
                entities: [] as any
            } as any),
            {
                provide: AGENT_OPTIONS,
                useValue: {
                    ...defaultAgentOptions,
                    tools: { ...defaultAgentOptions.tools, requireApproval }
                }
            }
        ]
    });
}

@Suite('approval manager is shared with the host')
export class ApprovalManagerSharingTest {

    @Test('the runtime configures the injected manager instead of creating a private one')
    async runtimeSharesInjectedManager() {
        const ctx = await buildApp(['terminal']);
        try {
            const runtime = ctx.get(AgentRuntime) as any;
            const injected = ctx.get(ApprovalManager) as any;
            expect(injected).toBe(runtime.approvalManager);
            expect(injected.isConfigured()).toBe(true);

            // Hosts inject this token (REST/RPC/UI): a pending request created
            // through it must be visible to every surface.
            const pending = injected.checkApproval('terminal', { cmd: 'ls' }, 's1');
            expect(injected.getPending().length).toEqual(1);
            const requestId = injected.getPending()[0].id;
            expect(injected.approve(requestId)).toBe(true);
            expect((await pending).decision).toEqual(ApprovalDecision.APPROVED);
            expect(injected.getPending().length).toEqual(0);
        } finally {
            await ctx.close();
        }
    }

    @Test('without approval rules no manager is installed')
    async noRulesNoManager() {
        const ctx = await buildApp([]);
        try {
            const runtime = ctx.get(AgentRuntime) as any;
            expect(runtime.approvalManager).toBeUndefined();
        } finally {
            await ctx.close();
        }
    }
}
