import expect = require('expect');
import { TransferSide, PacketIdGenerator } from '@tsdi/common';
import { useJsonPacket } from '../src/providers';

describe('useJsonPacket provider wiring', () => {
    it('registers PacketIdGenerator for client transfers', () => {
        const config: any = {
            side: TransferSide.client,
            transfer: {},
            providers: []
        };

        const filters = useJsonPacket()(config) as any[];

        expect(Array.isArray(filters)).toBe(true);
        expect(filters.length).toBeGreaterThan(0);
        expect(config.providers.some((provider: any) => provider.provide === PacketIdGenerator)).toBe(true);
    });

    it('does not register PacketIdGenerator for server transfers', () => {
        const config: any = {
            side: TransferSide.server,
            transfer: {},
            providers: []
        };

        const filters = useJsonPacket()(config) as any[];

        expect(Array.isArray(filters)).toBe(true);
        expect(filters.length).toBeGreaterThan(0);
        expect(config.providers.some((provider: any) => provider.provide === PacketIdGenerator)).toBe(false);
    });

    it('preserves custom transfer mapping when provided', () => {
        const mapping = () => ({ ok: true });
        const config: any = {
            side: TransferSide.client,
            transfer: { mapping },
            providers: []
        };

        useJsonPacket()(config);

        expect(config.transfer.mapping).toBe(mapping);
    });
});
