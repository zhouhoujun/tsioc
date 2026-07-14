import { Module } from '@tsdi/ioc';
import { ComponentsModule } from '@tsdi/components';
import { AgentModule } from '../agent.module';
import { AgentConsoleEventBridge } from './AgentConsoleEventBridge';
import { AgentConsoleSessionState } from './AgentConsoleSessionState';
import { AgentConsoleComponent } from './AgentConsoleComponent';
import {
    AgentConsoleActivityPanelComponent,
    AgentConsoleInputPanelComponent,
    AgentConsoleMessageDetailPanelComponent,
    AgentConsoleMessagesPanelComponent,
    AgentConsoleSelectPanelComponent,
    AgentConsoleSessionsPanelComponent,
    AgentConsoleStatusPanelComponent,
    AgentConsoleToolRunsPanelComponent,
    AgentConsoleToolsPanelComponent,
    AgentConsoleWorkingPanelComponent
} from './AgentConsolePanels';

@Module({
    imports: [
        ComponentsModule,
        AgentModule
    ],
    bootstrap: [
        AgentConsoleComponent
    ],
    declarations: [
        AgentConsoleComponent,
        AgentConsoleStatusPanelComponent,
        AgentConsoleInputPanelComponent,
        AgentConsoleWorkingPanelComponent,
        AgentConsoleSessionsPanelComponent,
        AgentConsoleToolsPanelComponent,
        AgentConsoleToolRunsPanelComponent,
        AgentConsoleMessagesPanelComponent,
        AgentConsoleMessageDetailPanelComponent,
        AgentConsoleActivityPanelComponent,
        AgentConsoleSelectPanelComponent
    ],
    providers: [
        AgentConsoleSessionState,
        AgentConsoleEventBridge
    ],
    exports: [
        AgentConsoleComponent,
        AgentConsoleStatusPanelComponent,
        AgentConsoleInputPanelComponent,
        AgentConsoleWorkingPanelComponent,
        AgentConsoleSessionsPanelComponent,
        AgentConsoleToolsPanelComponent,
        AgentConsoleToolRunsPanelComponent,
        AgentConsoleMessagesPanelComponent,
        AgentConsoleMessageDetailPanelComponent,
        AgentConsoleActivityPanelComponent,
        AgentConsoleSelectPanelComponent,
        AgentConsoleSessionState,
        AgentConsoleEventBridge
    ]
})
export class AgentUiModule {
}
