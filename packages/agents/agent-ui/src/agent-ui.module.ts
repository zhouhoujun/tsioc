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
import {
    AGENT_CONSOLE_MESSAGE_RENDERER_ROUTES,
    AgentConsoleAnswerRenderer,
    AgentConsoleApprovalMessageRenderer,
    AgentConsoleAttachmentRenderer,
    AgentConsoleArtifactMessageRenderer,
    AgentConsoleCommandMessageRenderer,
    AgentConsolePreambleRenderer,
    AgentConsolePartialRenderer,
    AgentConsoleDecisionMessageRenderer,
    AgentConsoleDiagnosticMessageRenderer,
    AgentConsoleErrorMessageRenderer,
    AgentConsoleFilesMessageRenderer,
    AgentConsoleMessageRendererRegistry,
    AgentConsolePlanMessageRenderer,
    AgentConsoleQuestionMessageRenderer,
    AgentConsoleThoughtMessageRenderer,
    AgentConsoleToolMessageRenderer
    , AgentConsoleUserRenderer
} from './AgentConsoleMessageRenderers';
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
import {
    AgentConsoleApprovalTemplate, AgentConsoleCommandTemplate, AgentConsoleErrorTemplate,
    AgentConsoleFilesTemplate, AgentConsolePlanTemplate, AgentConsoleQuestionTemplate,
    AgentConsoleMarkdownComponent, AgentConsoleSystemTemplate, AgentConsoleThoughtTemplate,
    AgentConsoleToolTemplate, AgentConsoleUserTemplate, AgentConsoleRoutedLineComponent,
    AgentConsoleRoutedTokensComponent
} from './AgentConsoleMessageTemplates';

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
        AgentConsoleRoutedTokensComponent,
        AgentConsoleRoutedLineComponent,
        AgentConsoleUserTemplate,
        AgentConsoleMarkdownComponent,
        AgentConsoleThoughtTemplate,
        AgentConsoleToolTemplate,
        AgentConsoleCommandTemplate,
        AgentConsolePlanTemplate,
        AgentConsoleFilesTemplate,
        AgentConsoleQuestionTemplate,
        AgentConsoleApprovalTemplate,
        AgentConsoleErrorTemplate,
        AgentConsoleSystemTemplate,
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
        AgentConsoleUserRenderer,
        AgentConsoleAnswerRenderer,
        AgentConsolePartialRenderer,
        AgentConsolePreambleRenderer,
        AgentConsoleDecisionMessageRenderer,
        AgentConsoleArtifactMessageRenderer,
        AgentConsoleAttachmentRenderer,
        AgentConsoleDiagnosticMessageRenderer,
        AgentConsoleThoughtMessageRenderer,
        AgentConsoleToolMessageRenderer,
        AgentConsoleCommandMessageRenderer,
        AgentConsolePlanMessageRenderer,
        AgentConsoleFilesMessageRenderer,
        AgentConsoleQuestionMessageRenderer,
        AgentConsoleApprovalMessageRenderer,
        AgentConsoleErrorMessageRenderer,
        {
            provide: AGENT_CONSOLE_MESSAGE_RENDERER_ROUTES,
            useValue: {
                user: AgentConsoleUserRenderer,
                'assistant-final': AgentConsoleAnswerRenderer,
                'assistant-partial': AgentConsolePartialRenderer,
                'assistant-preamble': AgentConsolePreambleRenderer,
                thought: AgentConsoleThoughtMessageRenderer,
                tool: AgentConsoleToolMessageRenderer,
                command: AgentConsoleCommandMessageRenderer,
                question: AgentConsoleQuestionMessageRenderer,
                approval: AgentConsoleApprovalMessageRenderer,
                plan: AgentConsolePlanMessageRenderer,
                'file-change': AgentConsoleFilesMessageRenderer,
                attachment: AgentConsoleAttachmentRenderer,
                error: AgentConsoleErrorMessageRenderer,
                warning: AgentConsoleDiagnosticMessageRenderer,
                cancelled: AgentConsoleDiagnosticMessageRenderer,
                system: AgentConsoleDiagnosticMessageRenderer
            }
        },
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
