import {
    AGENT_CONSOLE_GLOBAL_ACTIONS,
    AgentConsoleGlobalAction,
    AgentConsoleKeymapContext,
    isAgentConsoleGlobalAction,
    isAgentConsoleKeymapContext
} from './AgentConsoleKeymap';
import { VIM_ACTION_NAMES, isConsoleVimAction } from './AgentConsoleVim';
import { formatAgentUiNotice, type AgentUiTranslator } from './agent-ui.i18n';

export interface KeymapCommandHost {
    translator?: AgentUiTranslator | null;
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
            host.notify(formatAgentUiNotice(host.translator, 'keyBindings'));
            return;
        }
        host.state.openTextOverlay(scope ? `keymap ${scope}` : 'keymap', entries);
        return;
    }
    if (action === 'set') {
        const key = tokens[1];
        const target = tokens[2];
        if (!key || !target) {
            host.notify(formatAgentUiNotice(host.translator, 'keymapUsageSet'));
            return;
        }
        if (scope !== 'vim' && isAgentConsoleGlobalAction(target) && host.globalKeymap!.set(key, target, context)) {
            await host.persistGlobalKeymap();
            const conflicts = host.globalKeymap!.conflicts(key, target, context);
            const conflictText = conflicts.length
                ? `  conflicts with ${conflicts.map(({ context: c, action: a }: any) => `${c}:${a}`).join(', ')}`
                : '';
            host.notify(formatAgentUiNotice(host.translator, 'keymapSetWithConflict', { key: key, target: target, conflictText: conflictText }));
            return;
        }
        if ((scope === 'vim' || scope === '') && isConsoleVimAction(target) && host.state.setVimBinding(key, target)) {
            host.notify(formatAgentUiNotice(host.translator, 'vimKeymapSet', { key: key, target: target }));
            return;
        }
        host.notify(formatAgentUiNotice(host.translator, 'unknownKeymapActionInfo', { target: target, globalActions: AGENT_CONSOLE_GLOBAL_ACTIONS.join(', '), vimActions: VIM_ACTION_NAMES.join(', ') }));
        return;
    }
    if (action === 'unset') {
        const key = tokens[1];
        if (!key) {
            host.notify(formatAgentUiNotice(host.translator, 'keymapUsageUnset'));
            return;
        }
        if (scope !== 'vim' && host.globalKeymap!.unset(key, context)) {
            await host.persistGlobalKeymap();
            host.notify(formatAgentUiNotice(host.translator, 'contextKeymapUnset', { context: context === 'global' ? 'Global' : context, key: key }));
            return;
        }
        if ((scope === 'vim' || scope === '') && host.state.unsetVimBinding(key)) {
            host.notify(formatAgentUiNotice(host.translator, 'vimKeymapUnset', { key: key }));
            return;
        }
        host.notify(formatAgentUiNotice(host.translator, 'bindingKey', { key: key }));
        return;
    }
    if (action === 'reset') {
        if (scope === '' || scope === 'vim') host.state.resetVimBindings();
        if (scope === '' || scope === 'global' || isAgentConsoleKeymapContext(scope)) {
            host.globalKeymap!.reset(scope === '' ? undefined : context);
            await host.persistGlobalKeymap();
        }
        host.notify(formatAgentUiNotice(host.translator, 'keymapResetDefaults'));
        return;
    }
    if (action === 'record') {
        const target = tokens[1];
        if (!target) {
            host.notify(formatAgentUiNotice(host.translator, 'keymapUsageRecord'));
            return;
        }
        if (scope === 'vim' || !isAgentConsoleGlobalAction(target)) {
            host.notify(formatAgentUiNotice(host.translator, 'unknownKeymapAction', { target: target, globalActions: AGENT_CONSOLE_GLOBAL_ACTIONS.join(', ') }));
            return;
        }
        host.keymapRecording = { context, action: target };
        host.notify(formatAgentUiNotice(host.translator, 'recordingKeyPress', { target: target, context: context }));
        return;
    }
    host.notify(formatAgentUiNotice(host.translator, 'keymapUsage'));
}
