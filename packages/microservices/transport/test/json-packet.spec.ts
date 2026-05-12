import expect = require('expect');
import { PacketIdGenerator, TransferSide } from '@tsdi/common';
import { useJsonPacket } from '../src/providers';

describe('transport json packet', () => {
    it('adds PacketIdGenerator provider on client side', () => {
        const config: any = {
            side: TransferSide.client,
            transfer: {},
            providers: []
        };
        const interceptors = useJsonPacket()(config);
        expect(Array.isArray(interceptors)).toBe(true);
        expect(config.providers.some((provider: any) => provider.provide === PacketIdGenerator)).toBe(true);
    });

    it('does not add PacketIdGenerator provider on server side', () => {
        const config: any = {
            side: TransferSide.server,
            transfer: {},
            providers: []
        };
        const interceptors = useJsonPacket()(config);
        expect(Array.isArray(interceptors)).toBe(true);
        expect(config.providers.some((provider: any) => provider.provide === PacketIdGenerator)).toBe(false);
    });

    it('places socket interceptor at the tail of client and head-side of server flow', () => {
        const client = useJsonPacket()({ side: TransferSide.client, transfer: {}, providers: [] } as any) as Function[];
        const server = useJsonPacket()({ side: TransferSide.server, transfer: {}, providers: [] } as any) as Function[];
        expect(client.length).toBeGreaterThan(3);
        expect(server.length).toBeGreaterThan(3);
        expect(client[client.length - 1]).not.toBe(server[server.length - 1]);
    });
});
