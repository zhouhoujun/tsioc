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
            host.notify(host.translator?.translate('agent.notice.noStashedDrafts') || 'No stashed drafts. Use /stash push <name> to save the current draft.');
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
            host.notify(host.translator?.translate('agent.notice.emptyStash') || 'Nothing to stash: the draft is empty.');
            return true;
        }
        const name = requested || 'default';
        const stashes = await host.stashStore?.load(host.resolveHistoryWorkspace()) || {};
        stashes[name] = draft;
        try {
            await host.stashStore?.save(host.resolveHistoryWorkspace(), stashes);
        } catch (error: any) {
            host.notify(error?.message || 'Failed to stash the draft.');
            return true;
        }
        host.notify(`Draft stashed as "${name}".`);
        return true;
    }
    if (verb.toLowerCase() === 'pop' || verb.toLowerCase() === 'restore') {
        const name = requested || 'default';
        const stashes = await host.stashStore?.load(host.resolveHistoryWorkspace()) || {};
        if (!(name in stashes)) {
            host.notify(`No stash named "${name}". Available: ${Object.keys(stashes).join(', ') || 'none'}.`);
            return true;
        }
        host.state.updateDraft(stashes[name]);
        delete stashes[name];
        try {
            await host.stashStore?.save(host.resolveHistoryWorkspace(), stashes);
        } catch (error: any) {
            host.notify(error?.message || 'Restored the draft, but failed to remove the stash.');
            return true;
        }
        host.notify(`Restored stash "${name}" into the draft.`);
        return true;
    }
    if (verb.toLowerCase() === 'rm' || verb.toLowerCase() === 'drop' || verb.toLowerCase() === 'delete') {
        const name = requested || 'default';
        const stashes = await host.stashStore?.load(host.resolveHistoryWorkspace()) || {};
        if (!(name in stashes)) {
            host.notify(`No stash named "${name}". Available: ${Object.keys(stashes).join(', ') || 'none'}.`);
            return true;
        }
        delete stashes[name];
        try {
            await host.stashStore?.save(host.resolveHistoryWorkspace(), stashes);
        } catch (error: any) {
            host.notify(error?.message || 'Failed to remove the stash.');
            return true;
        }
        host.notify(`Removed stash "${name}".`);
        return true;
    }
    host.notify(host.translator?.translate('agent.notice.stashUsage') || 'Usage: /stash [list|push <name>|pop <name>|rm <name>]');
    return true;
}
