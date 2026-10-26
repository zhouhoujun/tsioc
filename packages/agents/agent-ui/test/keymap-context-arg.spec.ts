import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { runKeymapCommand } from '../src/AgentConsoleKeymapCommands';

interface Call { kind: 'set' | 'unset'; key: string; action?: string; context: string; }

function keymapHost(): { host: any; calls: Call[] } {
    const calls: Call[] = [];
    const host: any = {
        translator: null,
        state: {
            effectiveVimBindings: {},
            openTextOverlay: () => undefined,
            setVimBinding: () => true,
            unsetVimBinding: () => true
        },
        globalKeymap: {
            set: (key: string, action: string, context: string) => { calls.push({ kind: 'set', key, action, context }); return true; },
            unset: (key: string, context: string) => { calls.push({ kind: 'unset', key, context }); return true; },
            conflicts: () => [],
            effectiveBindings: () => ({})
        },
        persistGlobalKeymap: async () => undefined,
        notify: () => undefined
    };
    return { host, calls };
}

/**
 * The registry documents `/keymap set <key> <action> [context]`, but only a
 * leading scope was honored: `set ctrl+k copy composer` persisted a global
 * binding (verified in keymap.json), silently widening the user's intent.
 */
@Suite('/keymap context argument')
export class KeymapContextArgumentTest {

    @Test('a trailing context scopes the binding')
    async trailingContext() {
        const { host, calls } = keymapHost();
        await runKeymapCommand(host, 'set ctrl+k copy composer');
        expect(calls).toEqual([{ kind: 'set', key: 'ctrl+k', action: 'copy', context: 'composer' }]);
    }

    @Test('the leading scope form still works')
    async leadingContext() {
        const { host, calls } = keymapHost();
        await runKeymapCommand(host, 'composer set ctrl+j copy');
        expect(calls).toEqual([{ kind: 'set', key: 'ctrl+j', action: 'copy', context: 'composer' }]);
    }

    @Test('unset accepts a trailing context too')
    async unsetTrailingContext() {
        const { host, calls } = keymapHost();
        await runKeymapCommand(host, 'unset ctrl+k pager');
        expect(calls).toEqual([{ kind: 'unset', key: 'ctrl+k', context: 'pager' }]);
    }

    @Test('without a context the binding stays global')
    async defaultsToGlobal() {
        const { host, calls } = keymapHost();
        await runKeymapCommand(host, 'set ctrl+k copy');
        expect(calls).toEqual([{ kind: 'set', key: 'ctrl+k', action: 'copy', context: 'global' }]);
    }
}
