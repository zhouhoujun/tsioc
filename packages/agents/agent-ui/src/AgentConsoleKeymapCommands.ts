import {
    AGENT_CONSOLE_GLOBAL_ACTIONS,
    AgentConsoleGlobalAction,
    AgentConsoleKeymapContext,
    isAgentConsoleGlobalAction,
    isAgentConsoleKeymapContext
} from './AgentConsoleKeymap';
import { VIM_ACTION_NAMES, isConsoleVimAction } from './AgentConsoleVim';

export interface KeymapCommandHost {
    state: any;
    globalKeymap: any;
    keymapRecording?: { context: AgentConsoleKeymapContext; action: AgentConsoleGlobalAction };
    persistGlobalKeymap(): Promise<void>;
    notify(message: string): void;
}

export function resolveKeymapContext(host: KeymapCommandHost): AgentConsoleKeymapContext {
    if (host.state.focusLayers.hasApprovalFocus()) return 'approval';
    if (host.state.focusLayers.hasMessageFocus() || host.state.focusLayers.hasMessageDetailFocus() || host.state.hasTextOverlayFocus()) return 'pager';
    if (host.state.focusLayers.hasSessionFocus() || host.state.focusLayers.hasTaskFocus() || host.state.focusLayers.hasScheduledJobFocus()
        || host.state.focusLayers.hasToolFocus() || host.state.focusLayers.hasBlockingSelectMenu()) return 'list';
    if (host.state.inputFocused && !host.state.focusLayers.isAnyFocusActive()) return 'composer';
    return 'global';
}

export async function runKeymapCommand(host: KeymapCommandHost, args: string): Promise<void> {
    const rawTokens = String(args || '').trim().split(/\s+/).filter(Boolean);
    const first = (rawTokens[0] || '').toLowerCase();
    const isScopeToken = ['global', 'vim', 'composer', 'list', 'approval', 'pager'].includes(first);
    const scope = isScopeToken && (rawTokens.length > 1 || first !== 'list')
        ? rawTokens.shift()!.toLowerCase()
        : '';
    const context: AgentConsoleKeymapContext = isAgentConsoleKeymapContext(scope) ? scope : 'global';
    const tokens = rawTokens;
    const action = (tokens[0] || 'list').toLowerCase();
    if (action === 'list') {
        const globalEntries = Object.entries(host.globalKeymap!.effectiveBindings(context)).map(([key, value]) => `${key} -> ${value}`);
        const vimEntries = Object.entries(host.state.effectiveVimBindings).map(([key, value]) => `vim:${key} -> ${value}`);
        const entries = [...(scope === 'vim' ? [] : globalEntries), ...(scope === '' || scope === 'vim' ? vimEntries : [])];
        if (!entries.length) {
            host.notify('No key bindings.');
            return;
        }
        host.state.openTextOverlay(scope ? `keymap ${scope}` : 'keymap', entries);
        return;
    }
    if (action === 'set') {
        const key = tokens[1];
        const target = tokens[2];
        if (!key || !target) {
            host.notify('Usage: /keymap [global|composer|list|approval|pager|vim] set <key> <action>');
            return;
        }
        if (scope !== 'vim' && isAgentConsoleGlobalAction(target) && host.globalKeymap!.set(key, target, context)) {
            await host.persistGlobalKeymap();
            const conflicts = host.globalKeymap!.conflicts(key, target, context);
            const conflictText = conflicts.length
                ? `  conflicts with ${conflicts.map(({ context: c, action: a }: any) => `${c}:${a}`).join(', ')}`
                : '';
            host.notify(`Keymap set: ${key} -> ${target}${conflictText}`);
            return;
        }
        if ((scope === 'vim' || scope === '') && isConsoleVimAction(target) && host.state.setVimBinding(key, target)) {
            host.notify(`Vim keymap set: ${key} -> ${target}`);
            return;
        }
        host.notify(`Unknown keymap action: ${target}  (global: ${AGENT_CONSOLE_GLOBAL_ACTIONS.join(', ')}; vim: ${VIM_ACTION_NAMES.join(', ')})`);
        return;
    }
    if (action === 'unset') {
        const key = tokens[1];
        if (!key) {
            host.notify('Usage: /keymap [global|composer|list|approval|pager|vim] unset <key>');
            return;
        }
        if (scope !== 'vim' && host.globalKeymap!.unset(key, context)) {
            await host.persistGlobalKeymap();
            host.notify(`${context === 'global' ? 'Global' : context} keymap unset: ${key}`);
            return;
        }
        if ((scope === 'vim' || scope === '') && host.state.unsetVimBinding(key)) {
            host.notify(`Vim keymap unset: ${key} (default restored if any)`);
            return;
        }
        host.notify(`No binding for key: ${key}`);
        return;
    }
    if (action === 'reset') {
        if (scope === '' || scope === 'vim') host.state.resetVimBindings();
        if (scope === '' || scope === 'global' || isAgentConsoleKeymapContext(scope)) {
            host.globalKeymap!.reset(scope === '' ? undefined : context);
            await host.persistGlobalKeymap();
        }
        host.notify('Keymap reset to defaults.');
        return;
    }
    if (action === 'record') {
        const target = tokens[1];
        if (!target) {
            host.notify('Usage: /keymap [global|composer|list|approval|pager|vim] record <action>');
            return;
        }
        if (scope === 'vim' || !isAgentConsoleGlobalAction(target)) {
            host.notify(`Unknown keymap action: ${target}  (global: ${AGENT_CONSOLE_GLOBAL_ACTIONS.join(', ')})`);
            return;
        }
        host.keymapRecording = { context, action: target };
        host.notify(`Recording key for ${target} (${context}) — press a key now, Esc to cancel.`);
        return;
    }
    host.notify('Usage: /keymap [global|composer|list|approval|pager|vim] [list|set <key> <action>|unset <key>|reset|record <action>]');
}
