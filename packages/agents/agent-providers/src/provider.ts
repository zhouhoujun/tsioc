import { Provider, ProvdierOf, toProviders } from '@tsdi/ioc';
import { ModelAdapter } from '@tsdi/agent';

export function withAgentModelAdapter(adapter: ProvdierOf<ModelAdapter>): Provider[] {
    return toProviders(ModelAdapter, [adapter]);
}
