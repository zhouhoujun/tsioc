import expect = require('expect');
import { writeStreamValues } from '../src/client/client';

describe('writeStreamValues', () => {
    it('waits for drain when the stream applies backpressure', () => {
        const writes: number[] = [];
        let ended = false;
        let drain: (() => void) | undefined;
        const call = {
            write(value: number) {
                writes.push(value);
                return writes.length >= 2;
            },
            on(event: 'drain', callback: () => void) {
                if (event === 'drain') drain = callback;
            },
            end() {
                ended = true;
            }
        };

        writeStreamValues(call, [1, 2, 3]);
        expect(writes).toEqual([1]);
        expect(ended).toBe(false);

        drain?.();
        expect(writes).toEqual([1, 2, 3]);
        expect(ended).toBe(true);
    });

    it('ends immediately for an empty stream', () => {
        let ended = false;
        const call = {
            write() { return true; },
            on() { /* noop */ },
            end() { ended = true; }
        };
        writeStreamValues(call, []);
        expect(ended).toBe(true);
    });
});
