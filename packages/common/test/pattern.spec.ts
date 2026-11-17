import { defaultFormatter, patternToPath } from '../src/pattern';
import expect = require('expect');

describe('patternToPath', () => {

    it('returns string patterns unchanged', () => {
        expect(patternToPath('user/list')).toBe('user/list');
    });

    it('converts number patterns', () => {
        expect(patternToPath(42)).toBe('42');
    });

    it('uses the source of regular expressions', () => {
        expect(patternToPath(/^user\/\d+$/)).toBe('^user\\/\\d+$');
    });

    it('sorts object keys', () => {
        expect(patternToPath({ b: 2, a: 1 } as any)).toBe('a:1/b:2');
    });

    it('supports nested patterns', () => {
        expect(patternToPath({ user: { id: 1, role: 2 }, cmd: 'get' } as any))
            .toBe('cmd:get/user:id:1/role:2');
    });

    it('honours custom separators', () => {
        expect(patternToPath({ b: 2, a: 1 } as any, '&', '=')).toBe('a=1&b=2');
    });

    it('returns an empty string for undefined', () => {
        expect(patternToPath(undefined)).toBe('');
    });

});

describe('defaultFormatter', () => {

    it('formats object patterns as normalized routes', () => {
        expect(defaultFormatter.format({ b: 2, a: 1 } as any)).toBe('a:1/b:2');
    });

    it('normalizes surrounding slashes', () => {
        expect(defaultFormatter.format('/user/list/')).toBe('user/list');
    });

});
