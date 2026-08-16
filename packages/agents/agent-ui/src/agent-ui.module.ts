import { Module } from '@tsdi/ioc';
import { ComponentsModule } from '@tsdi/components';
import { AgentModule } from '@tsdi/agent';
import { I18nModule, I18N_PROVIDERS } from '@tsdi/i18n';
import { agentUiChinese, agentUiEnglish } from './agent-ui.i18n';
import { AgentConsoleEventBridge } from './AgentConsoleEventBridge';

function resolveDefaultLocale(): string {
    const env = (globalThis as any)?.process?.env || {};
    const lang = String(env.LANG || env.LC_ALL || '').toLowerCase();
    return /^zh|_cn/i.test(lang) ? 'zh-CN' : 'en';
}
import { AgentConsoleInputHistoryStore } from './AgentConsoleInputHistoryStore';
import { AgentConsoleSessionState } from './AgentConsoleSessionState';
import { AgentConsoleSessionService } from './AgentConsoleSessionService';
import { AgentConsoleComponent } from './AgentConsoleComponent';
import { AgentConsoleWorkspaceMentionsProvider } from './AgentConsoleWorkspaceMentions';
import { AgentConsoleKeymap, AgentConsoleKeymapStore } from './AgentConsoleKeymap';
import { AgentConsoleRawModeStore } from './AgentConsoleRawMode';
import { AgentConsoleSettingsStore } from './AgentConsoleSettingsStore';
import { AgentConsoleStashStore } from './AgentConsoleStash';
import { AgentConsoleThemeStore } from './AgentConsoleTheme';
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
    AgentConsoleWhichKeyPanelComponent,
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
        AgentConsoleWhichKeyPanelComponent
    ],
    providers: [
        ...I18N_PROVIDERS,
        AgentConsoleSessionState,
        AgentConsoleSessionService,
        AgentConsoleEventBridge,
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
        AgentConsoleWhichKeyPanelComponent,
        AgentConsoleSessionState,
        AgentConsoleSessionService,
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
