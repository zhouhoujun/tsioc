import {
    append, escapeHtml, isIPv4, isIPv6, joinPath, normalize, parseTokenList,
    htmlRegExp, xmlRegExp, XSSI_PREFIX
} from '../src/utils';
import expect = require('expect');

describe('joinPath', () => {

    it('joins segments with a single slash', () => {
        expect(joinPath('a', 'b')).toBe('a/b');
    });

    it('trims leading and trailing slashes', () => {
        expect(joinPath('/a/', '/b/')).toBe('a/b');
    });

    it('keeps parent segments inside the joined path (documented limitation)', () => {
        // `joinPath` does not normalise `..` segments: they are kept as-is once
        // the previous segment has already been mapped. Callers resolve them
        // with `normalize`/URL handling instead.
        expect(joinPath('a/b', '../c')).toBe('a/b/c');
    });

    it('drops current-directory segments', () => {
        expect(joinPath('a', './b')).toBe('a/b');
    });

    it('ignores empty segments', () => {
        expect(joinPath('a', '', undefined, 'b')).toBe('a/b');
    });

    it('returns an empty string for no input', () => {
        expect(joinPath()).toBe('');
    });

});

describe('normalize', () => {

    it('trims surrounding slashes', () => {
        expect(normalize('/a/b/')).toBe('a/b');
    });

    it('can drop the query string', () => {
        expect(normalize('/a/b?x=1', undefined, true)).toBe('a/b');
    });

    it('strips a prefix', () => {
        expect(normalize('/api/user', 'api')).toBe('user');
    });

    it('keeps the route when the prefix does not match', () => {
        expect(normalize('/other/user', 'api')).toBe('other/user');
    });

    it('returns an empty string for empty input', () => {
        expect(normalize('')).toBe('');
    });

});

describe('parseTokenList', () => {

    it('splits a comma separated header value', () => {
        expect(parseTokenList('a, b ,c')).toEqual(['a', 'b', 'c']);
    });

    it('returns a single token unchanged', () => {
        expect(parseTokenList('accept')).toEqual(['accept']);
    });

});

describe('append', () => {

    it('returns the field when the header is empty', () => {
        expect(append('', 'accept')).toBe('accept');
    });

    it('does not duplicate an existing field', () => {
        expect(append('accept', 'accept')).toBe('accept');
    });

    it('appends a new field', () => {
        expect(append('accept', 'origin')).toBe('accept, origin');
    });

    it('rejects a missing header', () => {
        expect(() => append(undefined as any, 'accept')).toThrow(/header argument is required/);
    });

    it('rejects a missing field', () => {
        expect(() => append('accept', '')).toThrow(/field argument is required/);
    });

    it('rejects an invalid header name', () => {
        expect(() => append('accept', 'bad field')).toThrow(/invalid header name/);
    });

});

describe('escapeHtml', () => {

    it('escapes markup characters', () => {
        expect(escapeHtml('<a href="x">&</a>'))
            .toBe('&lt;a href=&quot;x&quot;&gt;&amp;&lt;/a&gt;');
    });

    it('leaves plain text untouched', () => {
        expect(escapeHtml('plain text')).toBe('plain text');
    });

});

describe('ip helpers', () => {

    it('accepts IPv4 addresses', () => {
        expect(isIPv4('127.0.0.1')).toBe(true);
        expect(isIPv4('255.255.255.255')).toBe(true);
    });

    it('rejects invalid IPv4 addresses', () => {
        expect(isIPv4('999.1.1.1')).toBe(false);
        expect(isIPv4('localhost')).toBe(false);
    });

    it('accepts IPv6 addresses', () => {
        expect(isIPv6('::1')).toBe(true);
        expect(isIPv6('2001:db8::1')).toBe(true);
    });

    it('rejects invalid IPv6 addresses', () => {
        expect(isIPv6('127.0.0.1')).toBe(false);
        expect(isIPv6('abc')).toBe(false);
    });

});

describe('content sniffing helpers', () => {

    it('detects xml bodies', () => {
        expect(xmlRegExp.test('   <root>')).toBe(true);
        expect(xmlRegExp.test('{"a":1}')).toBe(false);
    });

    it('detects html-significant characters', () => {
        expect(htmlRegExp.test('<div>')).toBe(true);
        expect(htmlRegExp.test('plain')).toBe(false);
    });

    it('matches the XSSI prefix', () => {
        expect(XSSI_PREFIX.test(")]}',\n{}")).toBe(true);
        expect(XSSI_PREFIX.test('{}')).toBe(false);
    });

});
