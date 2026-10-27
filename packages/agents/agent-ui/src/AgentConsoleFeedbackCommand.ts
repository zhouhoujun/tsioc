import { formatAgentUiNotice, type AgentUiTranslator } from './agent-ui.i18n';

/** `/feedback` prints the packaging diagnostics steps (kept out of the facade). */
export function runFeedbackCommandView(
    notify: (message: string) => void,
    translator?: AgentUiTranslator | null
): boolean {
    notify([
        formatAgentUiNotice(translator, 'feedbackPackagingDiagnostics'),
        formatAgentUiNotice(translator, 'feedbackStep1'),
        formatAgentUiNotice(translator, 'feedbackStep2'),
        formatAgentUiNotice(translator, 'feedbackStep3'),
        formatAgentUiNotice(translator, 'feedbackStep4')
    ].join('\n'));
    return true;
}
