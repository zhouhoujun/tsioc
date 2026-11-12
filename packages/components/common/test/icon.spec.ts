import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import {
    ICON_LIBRARY,
    ICON_NAMES,
    getIcon,
    hasIcon,
    iconGlyphText,
    iconPathAttributes,
    resolveIcon
} from '../icon';

@Suite('common icon library')
export class IconLibraryTest {
    @Test('registers every workflow toolbar, menu and node icon')
    registersWorkflowIcons() {
        const required = [
            'run', 'resume', 'stop', 'undo', 'redo', 'delete', 'minus', 'plus',
            'fit', 'layout', 'duplicate', 'logs', 'save', 'library', 'json', 'clear',
            'rename', 'close', 'menu', 'caret-down', 'caret-right', 'check',
            'theme', 'language',
            'start', 'end', 'inject', 'task', 'function', 'condition', 'switch',
            'junction', 'sequence', 'parallel', 'join', 'loop', 'trigger', 'delay',
            'log', 'debug', 'http-request', 'assign', 'transform', 'template',
            'csv', 'change', 'statistics', 'merge', 'event-emit', 'event-wait',
            'command', 'split', 'map', 'filter', 'sort', 'range', 'batch',
            'trycatch', 'subprocess', 'comment', 'custom'
        ];
        required.forEach(name => {
            expect(hasIcon(name)).toBe(true);
            expect(!!ICON_LIBRARY[name].glyph).toBe(true);
            expect(ICON_LIBRARY[name].paths?.length).toBeGreaterThan(0);
        });
        expect(ICON_NAMES.length).toBeGreaterThanOrEqual(required.length);
    }

    @Test('resolves legacy glyphs and unknown names predictably')
    resolvesLegacyGlyphs() {
        expect(getIcon('run')?.glyph).toBe('▶');
        expect(getIcon('missing')).toBeUndefined();
        expect(resolveIcon('coap', '⇄')).toBe(ICON_LIBRARY['http-request']);
        expect(resolveIcon('⤢')).toBe(ICON_LIBRARY.fit);
        expect(resolveIcon('missing', '?')).toBe(ICON_LIBRARY.condition);
        expect(resolveIcon('missing', '@')).toBeUndefined();
    }

    @Test('renders filled paths and shared stroke attributes')
    buildsPathAttributes() {
        const run = iconPathAttributes('run');
        expect(run.length).toBe(1);
        expect(run[0]).toEqual({
            d: ICON_LIBRARY.run.paths?.[0] as string,
            fill: 'currentColor',
            stroke: 'none'
        });

        const rename = iconPathAttributes('rename', undefined, '1.2');
        expect(rename).toHaveLength(2);
        rename.forEach(path => {
            expect(path.fill).toBe('none');
            expect(path.stroke).toBe('currentColor');
            expect(path['stroke-width']).toBe('1.2');
        });
    }

    @Test('falls back to glyphs and normalizes sizes')
    fallsBackToGlyphs() {
        expect(iconPathAttributes('missing', '@')).toEqual([]);
        expect(iconGlyphText('missing', '@')).toBe('@');

        expect(iconPathAttributes('custom').length).toBe(1);
        expect(iconGlyphText('custom')).toBe('◆');

        expect(iconGlyphText(undefined, '✎')).toBe('✎');
        expect(iconPathAttributes('legacy', '✎').length).toBe(2);
    }
}
