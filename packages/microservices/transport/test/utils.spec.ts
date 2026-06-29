import expect = require('expect');
import { isBuffer, toBuffer } from '../src/utils';
import { Readable } from 'stream';

describe('transport utils', () => {
    describe('isBuffer', () => {
        it('returns true for Buffer', () => {
            expect(isBuffer(Buffer.from('test'))).toBe(true);
        });

        it('returns false for non-buffer values', () => {
            expect(isBuffer('string')).toBe(false);
            expect(isBuffer(123)).toBe(false);
            expect(isBuffer(null)).toBe(false);
            expect(isBuffer(undefined)).toBe(false);
            expect(isBuffer({})).toBe(false);
            expect(isBuffer([])).toBe(false);
        });
    });

    describe('toBuffer', () => {
        it('reads Readable and returns Buffer', async () => {
            const stream = Readable.from([Buffer.from('hello'), Buffer.from(' '), Buffer.from('world')]);
            const result = await toBuffer(stream as any);
            expect(Buffer.isBuffer(result)).toBe(true);
            expect(result.toString()).toBe('hello world');
        });

        it('throws TypeException when limit is exceeded', async () => {
            const stream = Readable.from([Buffer.from('hello'), Buffer.from(' '), Buffer.from('world')]);
            await expect(toBuffer(stream as any, 5)).rejects.toThrow();
        });

        it('returns concatenated buffer for multiple chunks', async () => {
            const stream = Readable.from([Buffer.from('aa'), Buffer.from('bb'), Buffer.from('cc')]);
            const result = await toBuffer(stream as any);
            expect(result.toString()).toBe('aabbcc');
        });

        it('handles empty stream', async () => {
            const stream = Readable.from([]);
            const result = await toBuffer(stream as any);
            expect(result.toString()).toBe('');
        });
    });
});
