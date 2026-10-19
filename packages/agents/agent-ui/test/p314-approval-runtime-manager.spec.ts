import expect = require('expect');
import { BeforeEach, Suite, Test } from '@tsdi/unit';
import { Application, ApplicationContext } from '@tsdi/core';
import { ComponentRef, ComponentsModule } from '@tsdi/components';
import { DOCUMENT } from '@tsdi/common';
import { HtmlTemplateModule } from '@tsdi/components/html';
import { AgentModule } from '@tsdi/agent';
import { AgentConsoleComponent, AgentUiModule } from '../src';

/**
 * P314: approval prompts are rendered from events, but resolving one needs the
 * approval manager that actually gates the tool. The runtime creates its own
 * manager when the DI token is unconfigured; reading only the console's
 * injected field sent the decision to an unconfigured RPC path, so pressing
 * `a`/`d` silently did nothing and the prompt stayed until it timed out.
 */
@Suite('approval resolution uses the runtime manager (P314)')
export class ApprovalRuntimeManagerTest {
    ctx!: ApplicationContext;

    @BeforeEach()
    async init() {
        this.ctx = await Application.run(AgentConsoleComponent, {
            deps: [AgentModule, AgentUiModule, HtmlTemplateModule, ComponentsModule],
            providers: [{
                provide: DOCUMENT,
                useFactory: () => {
                    const { JSDOM } = require('jsdom');
                    return new JSDOM('<!DOCTYPE html><html><body></body></html>').window.document;
                }
            }]
        });
    }

    @Test('the console resolves a pending approval through the runtime manager when no manager is injected')
    async resolvesViaRuntimeManager() {
        const ref = this.ctx.runners.getRef(AgentConsoleComponent) as ComponentRef<AgentConsoleComponent>;
        await ref.render();
        const component = ref.instance as any;
        const runtimeManager = component.runtime.approvalManager;
        expect(!!runtimeManager).toBe(true);

        // The CLI leaves the console without a usable injected manager.
        component.approvalManager = null;

        const pending = runtimeManager.checkApproval('delete_file', { path: 'apfix.txt' }, 'session-approval', true);
        await Promise.resolve();
        const requests = runtimeManager.getPending();
        expect(requests.length).toBe(1);
        expect(requests[0].sessionId).toBe('session-approval');

        const applied = await component.applyApprovalDecision('approve', requests[0].id);
        expect(applied).toBe(true);
        expect(runtimeManager.getPending().length).toBe(0);
        await pending.catch(() => undefined);
    }
}
