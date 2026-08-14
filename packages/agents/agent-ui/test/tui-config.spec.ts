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
        expect(resolved.diffStyle).toEqual('auto');
        expect(resolved.cursor).toEqual({ style: 'block', blinking: true });
        expect(resolved.scrollAcceleration).toEqual(false);
        expect(resolved.attention).toEqual({ notifications: false, soundPack: 'default', volume: 0.5, sounds: {} });
    }

    @Test('file layer overrides defaults')
    fileOverridesDefaults() {
        const resolved = mergeAgentTuiConfig({
            theme: 'light',
            scrollSpeed: 2,
            attentionSound: true,
            diffStyle: 'stacked',
            cursor: { style: 'underline', blinking: false },
            scrollAcceleration: true,
            attention: { notifications: true, soundPack: 'classic', volume: 0.8, sounds: { message: 'snd/msg.wav' } }
        });
        expect(resolved.theme).toEqual('light');
        expect(resolved.scrollSpeed).toEqual(2);
        expect(resolved.attentionSound).toEqual(true);
        expect(resolved.leaderTimeout).toEqual(3000);
        expect(resolved.diffStyle).toEqual('stacked');
        expect(resolved.cursor).toEqual({ style: 'underline', blinking: false });
        expect(resolved.scrollAcceleration).toEqual(true);
        expect(resolved.attention).toEqual({ notifications: true, soundPack: 'classic', volume: 0.8, sounds: { message: 'snd/msg.wav' } });
    }

    @Test('later layers win (CLI > env > file)')
    priorityOrder() {
        const resolved = mergeAgentTuiConfig(
            { theme: 'light', scrollSpeed: 2, mouse: true, diffStyle: 'stacked', scrollAcceleration: true, cursor: { style: 'line' } },
            { theme: 'solarized', scrollSpeed: 3, diffStyle: 'auto' },
            { theme: 'high-contrast' }
        );
        expect(resolved.theme).toEqual('high-contrast');
        expect(resolved.scrollSpeed).toEqual(3);
        expect(resolved.mouse).toEqual(true);
        expect(resolved.diffStyle).toEqual('auto');
        expect(resolved.scrollAcceleration).toEqual(true);
        expect(resolved.cursor).toEqual({ style: 'line', blinking: true });
    }

    @Test('keybinds merge shallowly across layers')
    keybindsMerge() {
        const resolved = mergeAgentTuiConfig(
            { keybinds: { send: 'ctrl+enter', cancel: 'escape' } },
            { keybinds: { send: 'enter', copy: 'ctrl+c' } }
        );
        expect(resolved.keybinds).toEqual({ send: 'enter', cancel: 'escape', copy: 'ctrl+c' });
    }

    @Test('cursor and attention configs merge shallowly across layers')
    nestedMerges() {
        const resolved = mergeAgentTuiConfig(
            { cursor: { style: 'block' }, attention: { soundPack: 'classic', volume: 0.9 } },
            { cursor: { blinking: false }, attention: { volume: 0.3, sounds: { approval: 'snd/ok.wav' } } }
        );
        expect(resolved.cursor).toEqual({ style: 'block', blinking: false });
        expect(resolved.attention).toEqual({
            notifications: false,
            soundPack: 'classic',
            volume: 0.3,
            sounds: { approval: 'snd/ok.wav' }
        });
    }

    @Test('invalid field types fall back to defaults')
    invalidTypes() {
        const resolved = normalizeAgentTuiConfig({
            scrollSpeed: -5,
            leaderTimeout: -1,
            theme: '',
            mouse: 'yes' as any,
            diffStyle: 'side-by-side' as any,
            scrollAcceleration: 'on' as any,
            cursor: { style: 'rainbow' as any, blinking: 'nope' as any },
            attention: { volume: 3, soundPack: '', notifications: 'yes' as any, sounds: [] as any }
        });
        expect(resolved.scrollSpeed).toEqual(1);
        expect(resolved.leaderTimeout).toEqual(3000);
        expect(resolved.theme).toEqual('dark');
        expect(resolved.mouse).toEqual(false);
        expect(resolved.diffStyle).toEqual('auto');
        expect(resolved.scrollAcceleration).toEqual(false);
        expect(resolved.cursor).toEqual({ style: 'block', blinking: true });
        expect(resolved.attention).toEqual({ notifications: false, soundPack: 'default', volume: 0.5, sounds: {} });
    }

    @Test('volume is clamped to the 0..1 range')
    volumeClamp() {
        const resolved = normalizeAgentTuiConfig({ attention: { volume: 1.5 } });
        expect(resolved.attention.volume).toEqual(0.5);
    }

    @Test('nullish layers are ignored')
    nullishLayers() {
        const resolved = mergeAgentTuiConfig(undefined, null as any, { theme: 'light' });
        expect(resolved.theme).toEqual('light');
        expect(resolved.diffStyle).toEqual('auto');
    }
}
