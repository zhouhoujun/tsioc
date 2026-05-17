import { Provider, ProvdierOf, toProviders } from '@tsdi/ioc';
import { ModelAdapter } from '@tsdi/agent';
import { AGENT_MODEL_ADAPTER } from '@tsdi/agent';


export function withAgentModelAdapter(adapter: ProvdierOf<ModelAdapter>): Provider[] {
    return toProviders(AGENT_MODEL_ADAPTER, [adapter]);
}
