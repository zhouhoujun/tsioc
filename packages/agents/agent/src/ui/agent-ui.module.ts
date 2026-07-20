import { Module } from '@tsdi/ioc';
import { ComponentsModule } from '@tsdi/components';
import { AgentModule } from '../agent.module';
import { AgentConsoleEventBridge } from './AgentConsoleEventBridge';
import { AgentConsoleSessionState } from './AgentConsoleSessionState';
import { AgentConsoleComponent } from './AgentConsoleComponent';
import { AgentConsoleWorkspaceMentionsProvider } from './AgentConsoleWorkspaceMentions';
import {
    AgentConsoleActivityPanelComponent,
    AgentConsoleBrandPanelComponent,
    AgentConsoleInputPanelComponent,
    AgentConsoleAssistantMessageItemComponent,
    AgentConsoleApprovalsPanelComponent,
    AgentConsoleMessageDetailPanelComponent,
    AgentConsoleMessageLineComponent,
    AgentConsoleMessageTokensComponent,
    AgentConsoleMessagesPanelComponent,
    AgentConsoleErrorMessageItemComponent,
    AgentConsoleSelectPanelComponent,
    AgentConsoleSessionsPanelComponent,
    AgentConsoleStatusPanelComponent,
    AgentConsoleSystemMessageItemComponent,
    AgentConsoleToolRunsPanelComponent,
    AgentConsoleToolsPanelComponent,
    AgentConsoleToolMessageItemComponent,
    AgentConsoleUserMessageItemComponent,
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
        AgentConsoleBrandPanelComponent,
        AgentConsoleStatusPanelComponent,
        AgentConsoleInputPanelComponent,
        AgentConsoleWorkingPanelComponent,
        AgentConsoleSessionsPanelComponent,
        AgentConsoleApprovalsPanelComponent,
        AgentConsoleToolsPanelComponent,
        AgentConsoleToolRunsPanelComponent,
        AgentConsoleMessageTokensComponent,
        AgentConsoleMessageLineComponent,
        AgentConsoleUserMessageItemComponent,
        AgentConsoleAssistantMessageItemComponent,
        AgentConsoleToolMessageItemComponent,
        AgentConsoleErrorMessageItemComponent,
        AgentConsoleSystemMessageItemComponent,
        AgentConsoleMessagesPanelComponent,
        AgentConsoleMessageDetailPanelComponent,
        AgentConsoleActivityPanelComponent,
        AgentConsoleSelectPanelComponent
    ],
    providers: [
        AgentConsoleSessionState,
        AgentConsoleEventBridge,
        AgentConsoleWorkspaceMentionsProvider
    ],
    exports: [
        AgentConsoleComponent,
        AgentConsoleBrandPanelComponent,
        AgentConsoleStatusPanelComponent,
        AgentConsoleInputPanelComponent,
        AgentConsoleWorkingPanelComponent,
        AgentConsoleSessionsPanelComponent,
        AgentConsoleApprovalsPanelComponent,
        AgentConsoleToolsPanelComponent,
        AgentConsoleToolRunsPanelComponent,
        AgentConsoleMessageTokensComponent,
        AgentConsoleMessageLineComponent,
        AgentConsoleUserMessageItemComponent,
        AgentConsoleAssistantMessageItemComponent,
        AgentConsoleToolMessageItemComponent,
        AgentConsoleErrorMessageItemComponent,
        AgentConsoleSystemMessageItemComponent,
        AgentConsoleMessagesPanelComponent,
        AgentConsoleMessageDetailPanelComponent,
        AgentConsoleActivityPanelComponent,
        AgentConsoleSelectPanelComponent,
        AgentConsoleSessionState,
        AgentConsoleEventBridge,
        AgentConsoleWorkspaceMentionsProvider
    ]
})
export class AgentUiModule {
}
