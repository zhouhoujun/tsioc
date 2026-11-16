import expect = require('expect');
import { Transport, matchTransport } from '../../src';

describe('matchTransport', () => {
    it('matches the same transport', () => {
        expect(matchTransport(
            { transport: Transport.HTTP },
            { transport: Transport.HTTP }
        )).toBe(true);
    });

    it('rejects a different transport', () => {
        expect(matchTransport(
            { transport: Transport.HTTP },
            { transport: Transport.TCP }
        )).toBe(false);
    });

    it('matches the transport name when declared', () => {
        const source = { transport: Transport.Redis, name: 'cache' };
        expect(matchTransport(source, { transport: Transport.Redis, name: 'cache' })).toBe(true);
        expect(matchTransport(source, { transport: Transport.Redis, name: 'queue' })).toBe(false);
    });

    it('does not constrain the name when the source omits it', () => {
        expect(matchTransport(
            { transport: Transport.Redis },
            { transport: Transport.Redis, name: 'any' }
        )).toBe(true);
    });

    it('matches the microservice mode when declared', () => {
        const source = { transport: Transport.HTTP, microservice: true };
        expect(matchTransport(source, { transport: Transport.HTTP, microservice: true })).toBe(true);
        expect(matchTransport(source, { transport: Transport.HTTP, microservice: false })).toBe(false);
    });
});
