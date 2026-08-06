import { Module } from '@tsdi/ioc';
import { ComponentsModule } from '@tsdi/components';
import { AgentModule } from '@tsdi/agent';
import { AgentConsoleEventBridge } from './AgentConsoleEventBridge';
import { AgentConsoleInputHistoryStore } from './AgentConsoleInputHistoryStore';
import { AgentConsoleSessionState } from './AgentConsoleSessionState';
import { AgentConsoleSessionService } from './AgentConsoleSessionService';
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
    AgentConsoleReviewPanelComponent,
    AgentConsoleErrorMessageItemComponent,
    AgentConsoleSelectPanelComponent,
    AgentConsoleSessionsPanelComponent,
    AgentConsoleStatusPanelComponent,
    AgentConsoleTasksPanelComponent,
    AgentConsoleJobsPanelComponent,
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
        AgentConsoleTasksPanelComponent,
        AgentConsoleJobsPanelComponent,
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
        AgentConsoleReviewPanelComponent,
        AgentConsoleActivityPanelComponent,
        AgentConsoleSelectPanelComponent
    ],
    providers: [
        AgentConsoleSessionState,
        AgentConsoleSessionService,
        AgentConsoleEventBridge,
        AgentConsoleInputHistoryStore,
        AgentConsoleWorkspaceMentionsProvider
    ],
    exports: [
        AgentConsoleComponent,
        AgentConsoleBrandPanelComponent,
        AgentConsoleStatusPanelComponent,
        AgentConsoleInputPanelComponent,
        AgentConsoleWorkingPanelComponent,
        AgentConsoleSessionsPanelComponent,
        AgentConsoleTasksPanelComponent,
        AgentConsoleJobsPanelComponent,
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
        AgentConsoleReviewPanelComponent,
        AgentConsoleActivityPanelComponent,
        AgentConsoleSelectPanelComponent,
        AgentConsoleSessionState,
        AgentConsoleSessionService,
        AgentConsoleEventBridge,
        AgentConsoleInputHistoryStore,
        AgentConsoleWorkspaceMentionsProvider
    ]
})
export class AgentUiModule {
}
