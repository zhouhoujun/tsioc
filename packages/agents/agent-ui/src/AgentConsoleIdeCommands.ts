export async function runIdeCommand(
    ideBridge: any,
    notify: (message: string) => void,
    pushCommandOutput: (command: string, text: string) => void,
    args?: string
): Promise<boolean> {
    const parsed = String(args || '').trim().toLowerCase();
    if (!ideBridge) {
        notify('No IDE bridge available. Attach an editor host (e.g. VS Code extension) to expose file context.');
        return true;
    }
    if (parsed === 'refresh' || parsed === 'detach') {
        notify(`IDE bridge: ${parsed === 'refresh' ? 'refreshed.' : 'detached.'}`);
        return true;
    }
    try {
        const context = await ideBridge.getContext();
        if (!context?.activeFile) {
            notify('IDE bridge connected, but no active file selected.');
            return true;
        }
        const selection = context.selection
            ? ` lines ${context.selection.startLine}-${context.selection.endLine}`
            : '';
        pushCommandOutput('/ide', `IDE context: ${context.activeFile}${selection}${context.platform ? ` (${context.platform})` : ''}`);
    } catch (error: any) {
        notify(error?.message || 'Failed to read IDE context.');
    }
    return true;
}
