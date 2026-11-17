import { HeaderMappings, getHeader, getHeaders, hasHeader } from '../src/headers';
import expect = require('expect');

describe('HeaderMappings', () => {

    it('looks headers up case insensitively', () => {
        const headers = new HeaderMappings({ 'Content-Type': 'application/json' } as any);

        expect(headers.getHeader('content-type')).toBe('application/json');
        expect(headers.getHeader('CONTENT-TYPE')).toBe('application/json');
    });

    it('keeps the original casing for header names', () => {
        const headers = new HeaderMappings({ 'Content-Type': 'application/json' } as any);

        expect(headers.getHeaderNames()).toEqual(['content-type']);
        expect(headers.getHeaders()).toEqual({ 'Content-Type': 'application/json' });
    });

    it('overwrites a header set twice', () => {
        const headers = new HeaderMappings();

        headers.setHeader('X-Test', 'a').setHeader('x-test', 'b');

        expect(headers.size).toBe(1);
        expect(headers.getHeader('x-test')).toBe('b');
    });

    it('appends multiple values', () => {
        const headers = new HeaderMappings();

        headers.append('Vary', 'accept').append('vary', 'origin');

        // `getHeader` returns the first value; `get` keeps the value list.
        expect(headers.get('VARY')).toEqual(['accept', 'origin']);
        expect(headers.getHeader('vary')).toBe('accept');
    });

    it('removes headers case insensitively', () => {
        const headers = new HeaderMappings({ Accept: 'a' } as any);

        headers.delete('ACCEPT');

        expect(headers.hasHeader('accept')).toBe(false);
        expect(headers.size).toBe(0);
    });

    it('deletes a header when set to null', () => {
        const headers = new HeaderMappings({ Accept: 'a' } as any);

        headers.set('accept', null as any);

        expect(headers.hasHeader('accept')).toBe(false);
    });

    it('parses a raw header block', () => {
        const headers = new HeaderMappings('Accept: a\nX-Test: b');

        expect(headers.getHeader('accept')).toBe('a');
        expect(headers.getHeader('x-test')).toBe('b');
    });

    it('iterates headers with their original names', () => {
        const headers = new HeaderMappings({ 'X-One': '1' } as any);
        const seen: Array<[string, any]> = [];

        headers.forEach((name, value) => seen.push([name, value]));

        expect(seen).toEqual([['X-One', '1']]);
    });

    it('copies another HeaderMappings instance', () => {
        const source = new HeaderMappings({ Accept: 'a' } as any);
        const copy = new HeaderMappings(source as any);

        expect(copy.getHeader('accept')).toBe('a');
    });

});

describe('header helpers', () => {

    it('hasHeader reads plain objects', () => {
        expect(hasHeader({ accept: 'a' } as any, 'accept')).toBe(true);
        expect(hasHeader({} as any, 'accept')).toBe(false);
        expect(hasHeader(undefined, 'accept')).toBe(false);
    });

    it('getHeader reads plain objects', () => {
        expect(getHeader({ accept: 'a' } as any, 'accept')).toBe('a');
        expect(getHeader(undefined, 'accept')).toBeUndefined();
    });

    it('getHeader unwraps arrays, optionally joined', () => {
        const headers = { vary: ['accept', 'origin'] } as any;

        expect(getHeader(headers, 'vary')).toBe('accept');
        expect(getHeader(headers, 'vary', true)).toBe('accept, origin');
    });

    it('getHeader delegates to HeaderMappings', () => {
        const headers = new HeaderMappings({ Accept: 'a' } as any);

        expect(getHeader(headers as any, 'accept')).toBe('a');
        expect(hasHeader(headers as any, 'Accept')).toBe(true);
    });

    it('getHeaders returns the plain record', () => {
        expect(getHeaders({ accept: 'a' } as any)).toEqual({ accept: 'a' } as any);
        expect(getHeaders(undefined)).toBeUndefined();
    });

});
