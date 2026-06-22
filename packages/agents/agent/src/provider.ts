import { Provider, ProvdierOf, toProviders } from '@tsdi/ioc';
import { FilterLike, GuardLike, InterceptorLike, RunContext } from '@tsdi/core';
import { AgentTool } from './tools/AgentTool';
import { AGENT_OPTIONS, AGENT_TOOLS, AGENT_TURN_FILTERS, AGENT_TURN_GUARDS, AGENT_TURN_INTERCEPTORS } from './tokens';
import { AgentOptions, mergeAgentOptions } from './options';
import { AgentTurnResult } from './runtime/AgentTurnResult';
import { AgentTurnInput } from './runtime/AgentTurnInput';
import { ModelAdapter } from './model/ModelAdapter';

export function createAgentProviders(options?: AgentOptions, ...tools: ProvdierOf<AgentTool>[]): Provider[] {
    return [
        { provide: AGENT_OPTIONS, useValue: mergeAgentOptions(options) },
        ...withAgentTools(...tools)
    ];
}

export function withAgentTools(...tools: ProvdierOf<AgentTool>[]): Provider[] {
    return toProviders(AGENT_TOOLS, tools, true);
}

export function withAgentTurnGuards(...guards: ProvdierOf<GuardLike<AgentTurnInput, RunContext>>[]): Provider[] {
    return toProviders(AGENT_TURN_GUARDS, guards, true);
}

export function withAgentTurnInterceptors(...interceptors: ProvdierOf<InterceptorLike<AgentTurnInput, Promise<AgentTurnResult>, RunContext>>[]): Provider[] {
    return toProviders(AGENT_TURN_INTERCEPTORS, interceptors, true);
}

export function withAgentTurnFilters(...filters: ProvdierOf<FilterLike<AgentTurnInput, Promise<AgentTurnResult>, RunContext>>[]): Provider[] {
    return toProviders(AGENT_TURN_FILTERS, filters, true);
}

export function withAgentModelAdapter(modelAdapter: ProvdierOf<ModelAdapter>): Provider[] {
    return toProviders(ModelAdapter, [modelAdapter]);
}

export function provideAgent(options?: AgentOptions, ...tools: ProvdierOf<AgentTool>[]): Provider[] {
    return createAgentProviders(options, ...tools);
}
