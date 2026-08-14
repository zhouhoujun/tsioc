import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { defaultAgentTuiConfig, mergeAgentTuiConfig, normalizeAgentTuiConfig } from '../src/AgentTuiConfig';

@Suite('tui.json config layer (P127)')
export class AgentTuiConfigTest {

    @Test('defaults apply when no layers are provided')
    defaults() {
        const resolved = normalizeAgentTuiConfig();
        expect(resolved).toEqual(defaultAgentTuiConfig);
        expect(resolved.theme).toEqual('dark');
        expect(resolved.scrollSpeed).toEqual(1);
        expect(resolved.mouse).toEqual(false);
        expect(resolved.attentionSound).toEqual(false);
        expect(resolved.leaderTimeout).toEqual(3000);
    }

    @Test('file layer overrides defaults')
    fileOverridesDefaults() {
        const resolved = mergeAgentTuiConfig({ theme: 'light', scrollSpeed: 2, attentionSound: true });
        expect(resolved.theme).toEqual('light');
        expect(resolved.scrollSpeed).toEqual(2);
        expect(resolved.attentionSound).toEqual(true);
        expect(resolved.leaderTimeout).toEqual(3000);
    }

    @Test('later layers win (CLI > env > file)')
    priorityOrder() {
        const resolved = mergeAgentTuiConfig(
            { theme: 'light', scrollSpeed: 2, mouse: true },
            { theme: 'solarized', scrollSpeed: 3 },
            { theme: 'high-contrast' }
        );
        expect(resolved.theme).toEqual('high-contrast');
        expect(resolved.scrollSpeed).toEqual(3);
        expect(resolved.mouse).toEqual(true);
    }

    @Test('keybinds merge shallowly across layers')
    keybindsMerge() {
        const resolved = mergeAgentTuiConfig(
            { keybinds: { send: 'ctrl+enter', cancel: 'escape' } },
            { keybinds: { send: 'enter', copy: 'ctrl+c' } }
        );
        expect(resolved.keybinds).toEqual({ send: 'enter', cancel: 'escape', copy: 'ctrl+c' });
    }

    @Test('invalid field types fall back to defaults')
    invalidTypes() {
        const resolved = normalizeAgentTuiConfig({ scrollSpeed: -5, leaderTimeout: -1, theme: '', mouse: 'yes' as any });
        expect(resolved.scrollSpeed).toEqual(1);
        expect(resolved.leaderTimeout).toEqual(3000);
        expect(resolved.theme).toEqual('dark');
        expect(resolved.mouse).toEqual(false);
    }

    @Test('nullish layers are ignored')
    nullishLayers() {
        const resolved = mergeAgentTuiConfig(undefined, null as any, { theme: 'light' });
        expect(resolved.theme).toEqual('light');
    }
}
