import { Module } from '@tsdi/ioc';
import { ComponentsModule } from '@tsdi/components';
import { AgentConsoleEventBridge } from './AgentConsoleEventBridge';
import { AgentConsoleSessionState } from './AgentConsoleSessionState';
import { AgentConsoleComponent } from './AgentConsoleComponent';

@Module({
    imports: [
        ComponentsModule
    ],
    declarations: [AgentConsoleComponent],
    providers: [
        AgentConsoleSessionState,
        AgentConsoleEventBridge
    ],
    exports: [
        AgentConsoleComponent,
        AgentConsoleSessionState,
        AgentConsoleEventBridge
    ]
})
export class AgentUiModule {
}
