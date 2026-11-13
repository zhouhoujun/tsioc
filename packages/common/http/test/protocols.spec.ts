import expect = require('expect');
import { TransferSide, Transport, matchTransport } from '../../src';

describe('matchTransport', () => {
    it('matches the same transport', () => {
        expect(matchTransport(
            { transport: Transport.HTTP, side: TransferSide.server },
            { transport: Transport.HTTP, side: TransferSide.server }
        )).toBe(true);
    });

    it('rejects a different transport', () => {
        expect(matchTransport(
            { transport: Transport.HTTP, side: TransferSide.server },
            { transport: Transport.TCP, side: TransferSide.server }
        )).toBe(false);
    });

    it('matches the transport name when declared', () => {
        const source = { transport: Transport.REDIS, side: TransferSide.server, name: 'cache' };
        expect(matchTransport(source, { transport: Transport.REDIS, side: TransferSide.server, name: 'cache' })).toBe(true);
        expect(matchTransport(source, { transport: Transport.REDIS, side: TransferSide.server, name: 'queue' })).toBe(false);
    });

    it('does not constrain the name when the source omits it', () => {
        expect(matchTransport(
            { transport: Transport.REDIS, side: TransferSide.server },
            { transport: Transport.REDIS, side: TransferSide.server, name: 'any' }
        )).toBe(true);
    });

    it('matches the microservice mode when declared', () => {
        const source = { transport: Transport.HTTP, side: TransferSide.server, microservice: true };
        expect(matchTransport(source, { transport: Transport.HTTP, side: TransferSide.server, microservice: true })).toBe(true);
        expect(matchTransport(source, { transport: Transport.HTTP, side: TransferSide.server, microservice: false })).toBe(false);
    });
});
