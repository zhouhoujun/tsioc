import { Module, ModuleWithProviders } from '@tsdi/ioc';
import { AgentModule } from '../agent.module';
import { AgentOptions } from '../options';

@Module({
    imports: [AgentModule]
})
export class HermesAgentModule {
    static withOptions(options: AgentOptions): ModuleWithProviders<AgentModule> {
        return AgentModule.withOptions(options);
    }
}
