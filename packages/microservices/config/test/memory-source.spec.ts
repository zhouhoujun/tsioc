import expect = require('expect');
import { MemoryConfigSource } from '../src/sources/env.source';

describe('MemoryConfigSource', () => {
    it('type is memory and priority is 0', () => {
        const source = new MemoryConfigSource();
        expect(source.type).toBe('memory');
        expect(source.priority).toBe(0);
    });

    it('load returns config', async () => {
        const source = new MemoryConfigSource();
        source.setConfig({ key: 'val' });
        const config = await source.load();
        expect(config.key).toBe('val');
    });

    it('setConfig replaces all config', async () => {
        const source = new MemoryConfigSource();
        source.setConfig({ a: 1 });
        source.setConfig({ b: 2 });
        const config = await source.load();
        expect(config.a).toBeUndefined();
        expect(config.b).toBe(2);
    });

    it('setValue sets key and notifies watchers', (done) => {
        const source = new MemoryConfigSource();
        source.watch((change) => {
            expect(change.key).toBe('nested.key');
            expect(change.newValue).toBe('val');
            done();
        });
        source.setValue('nested.key', 'val');
    });

    it('watch/unwatch works', () => {
        const source = new MemoryConfigSource();
        let calls = 0;
        const cb = () => { calls++; };
        source.watch(cb);
        source.unwatch();
        source.setValue('x', 'y');
        expect(calls).toBe(0);
    });

    it('clear resets config', () => {
        const source = new MemoryConfigSource();
        source.setConfig({ keep: 'this' });
        source.clear();
        source.load().then(config => {
            expect(config).toEqual({});
        });
    });
});
