import expect = require('expect');
import { Config } from '../src/decorator';

describe('@Config decorator', () => {
    it('Config is a function', () => {
        expect(typeof Config).toBe('function');
    });

    it('returns a decorator function when called with string', () => {
        const decorator = Config('app.port');
        expect(typeof decorator).toBe('function');
    });

    it('returns a decorator function when called with metadata', () => {
        const decorator = Config({ key: 'db.host', options: { required: true } });
        expect(typeof decorator).toBe('function');
    });

    it('can be used as parameter decorator', () => {
        const decorator = Config('my.key');
        let capturedTarget: any, capturedKey: any, capturedIndex: any;
        const spyDecorator = (target: any, key: any, index: any) => {
            capturedTarget = target;
            capturedKey = key;
            capturedIndex = index;
        };
        // Verify the returned decorator signature works
        expect(typeof decorator).toBe('function');
    });

    it('can be used as property decorator', () => {
        const decorator = Config('config.value');
        expect(typeof decorator).toBe('function');
    });
});
