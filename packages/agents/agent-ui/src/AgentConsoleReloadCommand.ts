import { formatAgentUiNotice, type AgentUiTranslator } from './agent-ui.i18n';

/** `/reload` re-reads the workspace settings and reports the outcome. */
export async function runReloadCommandView(
    reload: () => Promise<void>,
    notify: (message: string) => void,
    translator?: AgentUiTranslator | null
): Promise<boolean> {
    await reload();
    notify(formatAgentUiNotice(translator, 'configurationReloaded'));
    return true;
}
