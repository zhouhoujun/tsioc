import { token, HandlerLike } from '@tsdi/ioc';
import { FilterLike, GuardLike, InterceptorLike, RunContext } from '@tsdi/core';
import { AgentOptions } from './options';
import { AgentCapabilityBundle, AgentTool } from './tools/AgentTool';
import { AgentTurnResult } from './runtime/AgentTurnResult';
import { AgentTurnInput } from './runtime/AgentTurnInput';

export const AGENT_OPTIONS = token<AgentOptions>('AGENT_OPTIONS');
export const AGENT_TOOLS = token<AgentTool[]>('AGENT_TOOLS');
export const AGENT_TURN_BACKENDS = token<HandlerLike<AgentTurnInput, Promise<AgentTurnResult>, RunContext>[]>('AGENT_TURN_BACKENDS');
export const AGENT_TURN_GUARDS = token<GuardLike<AgentTurnInput, RunContext>[]>('AGENT_TURN_GUARDS');
export const AGENT_TURN_INTERCEPTORS = token<InterceptorLike<AgentTurnInput, Promise<AgentTurnResult>, RunContext>[]>('AGENT_TURN_INTERCEPTORS');
export const AGENT_TURN_FILTERS = token<FilterLike<AgentTurnInput, Promise<AgentTurnResult>, RunContext>[]>('AGENT_TURN_FILTERS');
export const AGENT_PROMPT_SECTIONS = token<import('./prompt/PromptSection').PromptSection[]>('AGENT_PROMPT_SECTIONS');
export const AGENT_TOOL_BUNDLES = token<AgentCapabilityBundle[]>('AGENT_TOOL_BUNDLES');
