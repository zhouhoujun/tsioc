import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import { MenuTypeahead, menuTypeaheadIndex } from '../menu-bar/src/menu-bar.typeahead';

@Suite('common menu typeahead')
export class MenuTypeaheadTest {
    @Test('accumulates printable keys and expires after the idle gap')
    async buffer() {
        const typeahead = new MenuTypeahead(100);
        expect(typeahead.push('t', 1000)).toEqual('t');
        expect(typeahead.push('h', 1050)).toEqual('th');
        expect(typeahead.push('e', 1200)).toEqual('e');
        expect(typeahead.push(' ', 1210)).toEqual('e');
    }

    @Test('repeating one character cycles instead of searching for doubles')
    async repeat() {
        const typeahead = new MenuTypeahead(1000);
        typeahead.push('r', 1000);
        expect(typeahead.push('r', 1010)).toEqual('r');
        expect(typeahead.push('u', 1020)).toEqual('ru');
    }

    @Test('finds the next enabled label, skips disabled rows and wraps')
    async matches() {
        const entries = [
            { label: 'Run' },
            { label: 'Stop', disabled: true },
            { label: 'Theme', disabled: false },
            { label: 'Undo' }
        ];
        expect(menuTypeaheadIndex(entries, 'r', -1)).toEqual(0);
        expect(menuTypeaheadIndex(entries, 'u', 0)).toEqual(3);
        expect(menuTypeaheadIndex(entries, 't', 0)).toEqual(2);
        expect(menuTypeaheadIndex(entries, 's', -1)).toEqual(-1);
        expect(menuTypeaheadIndex(entries, 'th', 2)).toEqual(2);
        expect(menuTypeaheadIndex([], 'r', 0)).toEqual(-1);
    }
}
