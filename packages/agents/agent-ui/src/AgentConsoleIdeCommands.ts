import { formatAgentUiNotice, type AgentUiTranslator } from './agent-ui.i18n';

export async function runIdeCommand(
    ideBridge: any,
    notify: (message: string) => void,
    pushCommandOutput: (command: string, text: string) => void,
    args?: string,
    translator?: AgentUiTranslator | null
): Promise<boolean> {
    const parsed = String(args || '').trim().toLowerCase();
    if (!ideBridge) {
        notify(formatAgentUiNotice(translator, 'ideBridgeUnavailable'));
        return true;
    }
    if (parsed === 'refresh' || parsed === 'detach') {
        notify(formatAgentUiNotice(translator, parsed === 'refresh' ? 'ideBridgeRefreshed' : 'ideBridgeDetached'));
        return true;
    }
    try {
        const context = await ideBridge.getContext();
        if (!context?.activeFile) {
            notify(formatAgentUiNotice(translator, 'ideNoActiveFile'));
            return true;
        }
        const selection = context.selection
            ? ` lines ${context.selection.startLine}-${context.selection.endLine}`
            : '';
        pushCommandOutput('/ide', `IDE context: ${context.activeFile}${selection}${context.platform ? ` (${context.platform})` : ''}`);
    } catch (error: any) {
        notify(error?.message || formatAgentUiNotice(translator, 'ideContextReadFailed'));
    }
    return true;
}
