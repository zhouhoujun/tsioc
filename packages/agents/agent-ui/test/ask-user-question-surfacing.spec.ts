import expect = require('expect');
import { After, Before, Suite, Test } from '@tsdi/unit';
import { Application, ApplicationContext, ApplicationRunners } from '@tsdi/core';
import { ComponentsModule } from '@tsdi/components';
import { TuiConsoleModule, ConsoleTerminalSurfaceAccessor as PlatformConsoleTerminalSurfaceAccessor } from '@tsdi/components/console';
import { AgentModule, AgentToolCompletedEvent } from '@tsdi/agent';
import { AgentConsoleComponent, AgentUiModule } from '../src';
import { ConsoleTerminalSurfaceAccessor } from '../src/console-ports';

/**
 * ask_user questions must surface as the console question panel (question text
 * + options) through the REAL TUI wiring.
 *
 * Regression: the console event bridge was never subscribed because its
 * `ApplicationContext` dependency was not injected (`@Optional()` without
 * `@Inject`), so the `ask_user` tool completion never set `pendingQuestion`
 * and users only saw a truncated transcript row.
 */
@Suite('ask_user question surfacing through the console wiring')
export class AskUserQuestionSurfacingUiTest {
    ctx!: ApplicationContext;

    @Before()
    async init() {
        this.ctx = await Application.run({
            module: {
                imports: [AgentModule, AgentUiModule, TuiConsoleModule, ComponentsModule],
                providers: [
                    {
                        provide: ConsoleTerminalSurfaceAccessor,
                        deps: [PlatformConsoleTerminalSurfaceAccessor],
                        useFactory: (surface: PlatformConsoleTerminalSurfaceAccessor) => surface
                    }
                ],
                bootstrap: [AgentConsoleComponent]
            }
        });
    }

    @After()
    async clean() {
        await this.ctx?.close();
        if (global.gc) global.gc();
    }

    protected console(): AgentConsoleComponent {
        const ref = this.ctx.get(ApplicationRunners).getRef(AgentConsoleComponent);
        expect(ref).toBeDefined();
        return ref!.instance;
    }

    @Test('ask_user tool completion surfaces the pending question panel through the real TUI wiring')
    async askUserSurfacesPendingQuestion() {
        const instance = this.console();
        const state = instance.sessionState;
        const context = this.ctx as any;
        context.publishEvent(new AgentToolCompletedEvent(context, state.sessionId, 'ask_user', {
            kind: 'ask_user',
            sessionId: state.sessionId,
            questionId: 'q-vim-emacs',
            question: 'Which code editor do you prefer?',
            options: ['vim', 'emacs'],
            severity: 'medium'
        }));
        await new Promise(resolve => setTimeout(resolve, 50));

        expect(state.pendingQuestion?.question).toEqual('Which code editor do you prefer?');
        expect(state.pendingQuestion?.options).toEqual(['vim', 'emacs']);
        expect(instance.showPendingQuestionPanel).toEqual(true);
    }
}
