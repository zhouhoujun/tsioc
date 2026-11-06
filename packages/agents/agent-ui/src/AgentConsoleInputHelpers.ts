export { parseSlashCommandLine as parseSlashCommandLine } from '@tsdi/components/common';

export async function handleMenuSelection(state: any, handleCommand: (value: string) => Promise<any>, value: string): Promise<void> {
    const selected = String(value || '').trim();
    if (!selected) {
        return;
    }
    const currentInput = String(state.input || '').trim();
    if (currentInput === '/help') {
        state.setInput('');
    }
    if (selected.startsWith('/')) {
        await handleCommand(selected);
        return;
    }
    if (selected.startsWith('@')) {
        const base = String(state.input || '').trim();
        const nextInput = base
            ? `${base} ${selected} `
            : `${selected} `;
        state.setInput(nextInput, state.clampCursor(nextInput, nextInput.length));
    }
}

export async function loadInputHistory(
    store: any,
    resolveHistoryWorkspace: () => string,
    state: any
): Promise<void> {
    if (!store) {
        return;
    }
    try {
        const workspace = resolveHistoryWorkspace();
        const entries = (await store.load(workspace))
            .filter((entry: any) => !state.inputHistoryController.shouldSkip(entry));
        if (workspace === resolveHistoryWorkspace()) {
            state.inputHistoryController.replace(entries);
        }
    } catch (error) {
        state.setLastError(state.translateLabel('agent.notice.inputHistoryLoadFailed', { error: error instanceof Error ? error.message : String(error) }, 'Failed to load input history: {error}'));
    }
}
