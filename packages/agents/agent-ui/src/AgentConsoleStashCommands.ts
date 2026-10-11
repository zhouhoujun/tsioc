import { formatAgentUiNotice } from './agent-ui.i18n';
export interface StashCommandHost {
    state: any;
    stashStore?: any;
    translator?: { translate(key: string): string };
    resolveHistoryWorkspace(): string;
    notify(message: string): void;
    pushCommandOutput(command: string, text: string, kind?: any): void;
}

export async function runStashCommand(host: StashCommandHost, args?: string): Promise<boolean> {
    const parsed = String(args || '').trim();
    if (!parsed || parsed.toLowerCase() === 'list') {
        const stashes = await host.stashStore?.load(host.resolveHistoryWorkspace()) || {};
        const names = Object.keys(stashes);
        if (!names.length) {
            host.notify(formatAgentUiNotice(host.translator, 'noStashedDrafts'));
            return true;
        }
        host.pushCommandOutput('/stash list', `Stashed drafts: ${names.map(name => `${name} (${stashes[name].length} chars)`).join(', ')}.`);
        return true;
    }
    const [verb, ...rest] = parsed.split(/\s+/);
    const requested = rest.join(' ').trim();
    if (verb.toLowerCase() === 'push' || verb.toLowerCase() === 'save') {
        const draft = String(host.state.input || '').trim();
        if (!draft) {
            host.notify(formatAgentUiNotice(host.translator, 'emptyStash'));
            return true;
        }
        const name = requested || 'default';
        const stashes = await host.stashStore?.load(host.resolveHistoryWorkspace()) || {};
        stashes[name] = draft;
        try {
            await host.stashStore?.save(host.resolveHistoryWorkspace(), stashes);
        } catch (error: any) {
            host.notify(error?.message || formatAgentUiNotice(host.translator, 'stashDraftFailed'));
            return true;
        }
        host.notify(formatAgentUiNotice(host.translator, 'draftStashedAs', { name: name }));
        return true;
    }
    if (verb.toLowerCase() === 'pop' || verb.toLowerCase() === 'restore') {
        const name = requested || 'default';
        const stashes = await host.stashStore?.load(host.resolveHistoryWorkspace()) || {};
        if (!(name in stashes)) {
            host.notify(formatAgentUiNotice(host.translator, 'noStashNamed', { name: name, names: Object.keys(stashes).join(', ') || 'none' }));
            return true;
        }
        host.state.updateDraft(stashes[name]);
        delete stashes[name];
        try {
            await host.stashStore?.save(host.resolveHistoryWorkspace(), stashes);
        } catch (error: any) {
            host.notify(error?.message || formatAgentUiNotice(host.translator, 'stashRestoreRemoveFailed'));
            return true;
        }
        host.notify(formatAgentUiNotice(host.translator, 'stashRestored', { name: name }));
        return true;
    }
    if (verb.toLowerCase() === 'rm' || verb.toLowerCase() === 'drop' || verb.toLowerCase() === 'delete') {
        const name = requested || 'default';
        const stashes = await host.stashStore?.load(host.resolveHistoryWorkspace()) || {};
        if (!(name in stashes)) {
            host.notify(formatAgentUiNotice(host.translator, 'noStashNamed', { name: name, names: Object.keys(stashes).join(', ') || 'none' }));
            return true;
        }
        delete stashes[name];
        try {
            await host.stashStore?.save(host.resolveHistoryWorkspace(), stashes);
        } catch (error: any) {
            host.notify(error?.message || formatAgentUiNotice(host.translator, 'stashRemoveFailed'));
            return true;
        }
        host.notify(formatAgentUiNotice(host.translator, 'stashRemoved', { name: name }));
        return true;
    }
    host.notify(formatAgentUiNotice(host.translator, 'stashUsage'));
    return true;
}
