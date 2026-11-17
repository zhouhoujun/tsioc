import expect = require('expect');
import { Suite, Test } from '@tsdi/unit';
import {
    codePointDisplayWidth,
    fitByDisplayWidth,
    getDisplayWidth,
    isWideCodePoint,
    padByDisplayWidth,
    sliceByDisplayWidth
} from '../src/display-width';

@Suite('common display width')
export class DisplayWidthTest {
    @Test('measures ASCII, CJK, emoji and zero-width glyphs')
    measuresUnicode() {
        expect(getDisplayWidth('abc')).toEqual(3);
        expect(getDisplayWidth('组件')).toEqual(4);
        expect(getDisplayWidth('你好 world')).toEqual(10);
        expect(getDisplayWidth('\u{1F600}')).toEqual(2);
        expect(getDisplayWidth('\u{1F680}')).toEqual(2);
        expect(getDisplayWidth('e\u0301')).toEqual(1);
        expect(getDisplayWidth('a\u200Bb')).toEqual(2);
        expect(getDisplayWidth('\uFE0F')).toEqual(0);
        expect(codePointDisplayWidth(0x1F680)).toEqual(2);
        expect(isWideCodePoint(0x4E2D)).toEqual(true);
    }

    @Test('ignores ANSI SGR sequences while measuring')
    measuredWithAnsi() {
        expect(getDisplayWidth('\x1b[31mred\x1b[0m')).toEqual(3);
        expect(getDisplayWidth('\x1b[1;38;5;208m你好\x1b[0m')).toEqual(4);
        expect(getDisplayWidth('\x1b[31mred\x1b[0m '.repeat(2000))).toEqual(8000);
        // A non-SGR escape is ordinary text, matching the previous contract.
        expect(getDisplayWidth('\x1b[2J')).toEqual(4);
    }

    @Test('slices without splitting wide glyphs and keeps styles balanced')
    slices() {
        expect(sliceByDisplayWidth('组件abc', 5)).toEqual('组件a');
        expect(sliceByDisplayWidth('组件abc', 4)).toEqual('组件');
        expect(sliceByDisplayWidth('组件abc', 3)).toEqual('组');
        expect(sliceByDisplayWidth('\x1b[31mred\x1b[0m', 2)).toEqual('\x1b[31mre\x1b[0m');
        expect(sliceByDisplayWidth('\x1b[31mred\x1b[0m', 3)).toEqual('\x1b[31mred\x1b[0m');
        expect(sliceByDisplayWidth('abc', 0)).toEqual('');
        expect(sliceByDisplayWidth('', 5)).toEqual('');
    }

    @Test('pads and fits by display width')
    padsAndFits() {
        expect(padByDisplayWidth('组件', 6)).toEqual('组件  ');
        expect(padByDisplayWidth('abcdef', 3)).toEqual('abc');
        expect(fitByDisplayWidth('组件abc', 5)).toEqual('组...');
        expect(fitByDisplayWidth('abc', 5)).toEqual('abc');
        expect(fitByDisplayWidth('abcdef', 3)).toEqual('abc');
    }
}
