import expect = require('expect');
import { DefaultConfigurationManager } from '../src/manager';
import { ConfigSource } from '../src/config';

class TestConfigSource implements ConfigSource {
    type: 'memory' = 'memory';
    priority: number;
    name: string;
    enabled = true;
    optional = false;
    private data: Record<string, any>;

    constructor(data: Record<string, any>, priority = 0, name = 'test') {
        this.data = data;
        this.priority = priority;
        this.name = name;
    }

    async load(): Promise<Record<string, any>> {
        return { ...this.data };
    }
}

describe('DefaultConfigurationManager', () => {
    it('constructor stores defaults', () => {
        const mgr = new DefaultConfigurationManager({ defaults: { app: { name: 'test' } } });
        expect(mgr.get('app.name')).toBe('test');
    });

    it('get supports dot notation', () => {
        const mgr = new DefaultConfigurationManager({ defaults: { a: { b: { c: 'deep' } } } });
        expect(mgr.get('a.b.c')).toBe('deep');
    });

    it('get returns defaultValue when key not found', () => {
        const mgr = new DefaultConfigurationManager();
        expect(mgr.get('missing', { defaultValue: 'fallback' })).toBe('fallback');
    });

    it('get throws required when key not found', () => {
        const mgr = new DefaultConfigurationManager();
        expect(() => mgr.get('missing', { required: true })).toThrow();
    });

    it('getRequired throws for missing key', () => {
        const mgr = new DefaultConfigurationManager();
        expect(() => mgr.getRequired('missing')).toThrow();
    });

    it('set stores value', () => {
        const mgr = new DefaultConfigurationManager();
        mgr.set('my.key', 'value');
        expect(mgr.get('my.key')).toBe('value');
    });

    it('has checks key existence', () => {
        const mgr = new DefaultConfigurationManager({ defaults: { exists: true } });
        expect(mgr.has('exists')).toBe(true);
        expect(mgr.has('missing')).toBe(false);
    });

    it('getAll returns full config copy', () => {
        const mgr = new DefaultConfigurationManager({ defaults: { x: 1 } });
        const all = mgr.getAll();
        expect(all.x).toBe(1);
        // Should not be the same reference
        all.x = 2;
        expect(mgr.get('x')).toBe(1);
    });

    it('addSource adds and sorts by priority descending', async () => {
        const mgr = new DefaultConfigurationManager();
        const low = new TestConfigSource({ val: 'low' }, 10);
        const high = new TestConfigSource({ val: 'high' }, 100);
        mgr.addSource(low);
        mgr.addSource(high);
        await mgr.load();
        expect(mgr.get('val')).toBe('high');
    });

    it('removeSource removes by name', () => {
        const mgr = new DefaultConfigurationManager();
        const src = new TestConfigSource({ val: 1 }, 0, 'custom');
        mgr.addSource(src);
        mgr.removeSource('custom');
        mgr.load();
        expect(mgr.get('val')).toBeUndefined();
    });

    it('load merges from multiple sources', async () => {
        const mgr = new DefaultConfigurationManager();
        mgr.addSource(new TestConfigSource({ db: { host: 'localhost' } }, 10, 'src1'));
        mgr.addSource(new TestConfigSource({ db: { port: 5432 } }, 5, 'src2'));
        await mgr.load();
        expect(mgr.get('db.host')).toBe('localhost');
        expect(mgr.get('db.port')).toBe(5432);
    });

    it('watch calls callback on change', (done) => {
        const mgr = new DefaultConfigurationManager();
        mgr.watch('mykey', (change) => {
            expect(change.key).toBe('mykey');
            expect(change.newValue).toBe('newval');
            done();
        });
        mgr.set('mykey', 'newval');
    });

    it('unwatch stops callback', () => {
        const mgr = new DefaultConfigurationManager();
        let calls = 0;
        const cb = () => { calls++; };
        mgr.watch('test', cb);
        mgr.unwatch('test', cb);
        mgr.set('test', 'val');
        expect(calls).toBe(0);
    });

    it('clear removes everything', () => {
        const mgr = new DefaultConfigurationManager({ defaults: { x: 1 } });
        mgr.set('y', 2);
        mgr.clear();
        expect(mgr.get('x')).toBeUndefined();
        expect(mgr.get('y')).toBeUndefined();
        expect(mgr.getAll()).toEqual({});
    });

    it('transform option works', () => {
        const mgr = new DefaultConfigurationManager({ defaults: { port: '8080' } });
        const port = mgr.get('port', { transform: (v: string) => parseInt(v, 10) });
        expect(port).toBe(8080);
    });

    it('watch supports wildcard patterns', (done) => {
        const mgr = new DefaultConfigurationManager();
        mgr.watch('db.*', (change) => {
            expect(change.key).toBe('db.host');
            done();
        });
        mgr.set('db.host', 'localhost');
    });
});
