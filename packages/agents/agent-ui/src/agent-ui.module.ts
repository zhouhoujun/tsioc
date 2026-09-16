import { Module } from '@tsdi/ioc';
import { ComponentsModule } from '@tsdi/components';
import { AgentModule } from '@tsdi/agent';
import { I18nModule, I18N_PROVIDERS } from '@tsdi/i18n';
import { getGlobalProcess } from './global-process';
import { agentUiChinese, agentUiEnglish } from './agent-ui.i18n';
import { AgentConsoleEventBridge } from './AgentConsoleEventBridge';
import { AgentConsolePathProvider } from './AgentConsolePathProvider';

function resolveDefaultLocale(): string {
    const env = getGlobalProcess()?.env || {};
    const lang = String(env.LANG || env.LC_ALL || '').toLowerCase();
    return /^zh|_cn/i.test(lang) ? 'zh-CN' : 'en';
}
import { AgentConsoleInputHistoryStore } from './AgentConsoleInputHistoryStore';
import { AgentConsoleWorkspaceMentionsProvider } from './AgentConsoleWorkspaceMentions';
import { AgentConsoleKeymap, AgentConsoleKeymapStore } from './AgentConsoleKeymap';
import { AgentConsoleRawModeStore } from './AgentConsoleRawMode';
import { AgentConsoleSettingsStore } from './AgentConsoleSettingsStore';
import { AgentConsoleStashStore } from './AgentConsoleStash';
import { AgentConsoleThemeStore } from './AgentConsoleTheme';
import { AgentConsoleSessionState } from './AgentConsoleSessionState';
import { AgentConsoleSessionService } from './AgentConsoleSessionService';
import { AgentConsoleMessageRendererRegistry } from './AgentConsoleMessageRenderers';
import { AgentConsoleComponent } from './AgentConsoleComponent';
import {
    AgentConsoleActivityPanelComponent,
    AgentConsoleBrandPanelComponent,
    AgentConsoleCommandOutputsPanelComponent,
    AgentConsoleInputPanelComponent,
    AgentConsoleAssistantMessageItemComponent,
    AgentConsoleApprovalsPanelComponent,
    AgentConsoleMessageDetailPanelComponent,
    AgentConsoleTimelineEventDetailPanelComponent,
    AgentConsoleMessageLineComponent,
    AgentConsoleMessageTokensComponent,
    AgentConsoleMessagesPanelComponent,
    AgentConsoleReviewPanelComponent,
    AgentConsoleErrorMessageItemComponent,
    AgentConsoleGitSnapshotPanelComponent,
    AgentConsoleSelectPanelComponent,
    AgentConsoleWhichKeyPanelComponent,
    AgentConsoleHealthPopoverComponent,
    AgentConsolePendingQuestionPanelComponent,
    AgentConsoleSessionsPanelComponent,
    AgentConsoleStatusPanelComponent,
    AgentConsoleTasksPanelComponent,
    AgentConsoleJobsPanelComponent,
    AgentConsoleSystemMessageItemComponent,
    AgentConsoleTextOverlayPanelComponent,
    AgentConsoleToolRunsPanelComponent,
    AgentConsoleToolsPanelComponent,
    AgentConsoleToolMessageItemComponent,
    AgentConsoleUserMessageItemComponent,
    AgentConsoleWorkingPanelComponent
} from './AgentConsolePanels';

@Module({
    imports: [
        ComponentsModule,
        AgentModule,
        I18nModule.withLocales({
            en: agentUiEnglish,
            'zh-CN': agentUiChinese
        }, resolveDefaultLocale())
    ],
    bootstrap: [
        AgentConsoleComponent
    ],
    declarations: [
        AgentConsoleComponent,
        AgentConsoleBrandPanelComponent,
        AgentConsoleCommandOutputsPanelComponent,
        AgentConsoleStatusPanelComponent,
        AgentConsoleInputPanelComponent,
        AgentConsoleWorkingPanelComponent,
        AgentConsoleSessionsPanelComponent,
        AgentConsoleTasksPanelComponent,
        AgentConsoleJobsPanelComponent,
        AgentConsoleApprovalsPanelComponent,
        AgentConsoleToolsPanelComponent,
        AgentConsoleToolRunsPanelComponent,
        AgentConsoleTextOverlayPanelComponent,
        AgentConsolePendingQuestionPanelComponent,
        AgentConsoleMessageTokensComponent,
        AgentConsoleMessageLineComponent,
        AgentConsoleUserMessageItemComponent,
        AgentConsoleAssistantMessageItemComponent,
        AgentConsoleToolMessageItemComponent,
        AgentConsoleErrorMessageItemComponent,
        AgentConsoleGitSnapshotPanelComponent,
        AgentConsoleSystemMessageItemComponent,
        AgentConsoleMessagesPanelComponent,
        AgentConsoleMessageDetailPanelComponent,
        AgentConsoleTimelineEventDetailPanelComponent,
        AgentConsoleReviewPanelComponent,
        AgentConsoleActivityPanelComponent,
        AgentConsoleSelectPanelComponent,
        AgentConsoleWhichKeyPanelComponent,
        AgentConsoleHealthPopoverComponent
    ],
    providers: [
        ...I18N_PROVIDERS,
        AgentConsoleSessionState,
        AgentConsoleSessionService,
        AgentConsoleMessageRendererRegistry,
        AgentConsoleEventBridge,
        AgentConsolePathProvider,
        AgentConsoleInputHistoryStore,
        AgentConsoleWorkspaceMentionsProvider,
        AgentConsoleKeymap,
        AgentConsoleKeymapStore,
        AgentConsoleRawModeStore,
        AgentConsoleSettingsStore,
        AgentConsoleStashStore,
        AgentConsoleThemeStore
    ],
    exports: [
        AgentConsoleComponent,
        AgentConsoleBrandPanelComponent,
        AgentConsoleCommandOutputsPanelComponent,
        AgentConsoleStatusPanelComponent,
        AgentConsoleInputPanelComponent,
        AgentConsoleWorkingPanelComponent,
        AgentConsoleSessionsPanelComponent,
        AgentConsoleTasksPanelComponent,
        AgentConsoleJobsPanelComponent,
        AgentConsoleApprovalsPanelComponent,
        AgentConsoleToolsPanelComponent,
        AgentConsoleToolRunsPanelComponent,
        AgentConsoleTextOverlayPanelComponent,
        AgentConsolePendingQuestionPanelComponent,
        AgentConsoleMessageTokensComponent,
        AgentConsoleMessageLineComponent,
        AgentConsoleUserMessageItemComponent,
        AgentConsoleAssistantMessageItemComponent,
        AgentConsoleToolMessageItemComponent,
        AgentConsoleErrorMessageItemComponent,
        AgentConsoleGitSnapshotPanelComponent,
        AgentConsoleSystemMessageItemComponent,
        AgentConsoleMessagesPanelComponent,
        AgentConsoleMessageDetailPanelComponent,
        AgentConsoleTimelineEventDetailPanelComponent,
        AgentConsoleReviewPanelComponent,
        AgentConsoleActivityPanelComponent,
        AgentConsoleSelectPanelComponent,
        AgentConsoleWhichKeyPanelComponent,
        AgentConsoleHealthPopoverComponent,
        AgentConsoleSessionState,
        AgentConsoleSessionService,
        AgentConsoleMessageRendererRegistry,
        AgentConsoleEventBridge,
        AgentConsoleInputHistoryStore,
        AgentConsoleWorkspaceMentionsProvider,
        AgentConsoleKeymap,
        AgentConsoleKeymapStore,
        AgentConsoleSettingsStore,
        AgentConsoleStashStore,
        AgentConsoleThemeStore
    ]
})
export class AgentUiModule {
}
