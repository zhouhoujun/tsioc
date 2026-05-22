import { Injectable } from '@tsdi/ioc';
import { AbstractConfigableHandler, ConfigableHandler, ExceptionHandlerFilter, HandlerOptions, RunContext, createHandler, ApplicationContext } from '@tsdi/core';
import { AGENT_TURN_BACKENDS, AGENT_TURN_FILTERS, AGENT_TURN_GUARDS, AGENT_TURN_INTERCEPTORS } from '../tokens';
import { AgentRuntime } from './AgentRuntime';
import { AgentTurnResult } from './AgentTurnResult';
import { AgentTurnInput } from './AgentTurnInput';

@Injectable()
export class TurnHandler extends AbstractConfigableHandler<AgentTurnInput, Promise<AgentTurnResult>, RunContext> {
    private readonly handler: ConfigableHandler<AgentTurnInput, Promise<AgentTurnResult>, RunContext>;

    constructor(app: ApplicationContext, runtime: AgentRuntime) {
        super();
        this.handler = createHandler(app, runtime.executeTurn.bind(runtime), AGENT_TURN_BACKENDS, AGENT_TURN_INTERCEPTORS, AGENT_TURN_GUARDS, AGENT_TURN_FILTERS, {
            filters: [ExceptionHandlerFilter]
        });
    }

    get injector() {
        return this.handler.injector;
    }

    append(options: HandlerOptions<AgentTurnInput, Promise<AgentTurnResult>, RunContext>): this {
        this.handler.append(options);
        return this;
    }

    handle(input: AgentTurnInput, context: RunContext): Promise<AgentTurnResult> {
        return this.handler.handle(input, context);
    }

    onDestroy(): void {
        this.handler.onDestroy();
    }
}
