import expect = require('expect');
import { PacketNumberIdGenerator } from '../src/PacketId';

describe('PacketNumberIdGenerator', () => {
    it('getPacketId returns numbers in valid range', () => {
        const gen = new PacketNumberIdGenerator();
        for (let i = 0; i < 100; i++) {
            const id = gen.getPacketId();
            expect(typeof id).toBe('number');
            expect(id).toBeGreaterThanOrEqual(1);
            expect(id).toBeLessThanOrEqual(65536);
        }
    });

    it('getPacketId returns unique IDs', () => {
        const gen = new PacketNumberIdGenerator();
        const ids = new Set<number>();
        for (let i = 0; i < 100; i++) {
            ids.add(gen.getPacketId() as number);
        }
        expect(ids.size).toBe(100);
    });

    it('readId correctly reads from buffer', () => {
        const gen = new PacketNumberIdGenerator();
        const id = gen.getPacketId() as number;
        const buf = Buffer.alloc(2);
        buf.writeInt16BE(id, 0);
        const read = gen.readId(buf);
        expect(read).toBe(id);
    });

    it('idLenght property is 2', () => {
        const gen = new PacketNumberIdGenerator();
        expect(gen.idLenght).toBe(2);
    });

    it('throws when allocator is exhausted', () => {
        const gen = new PacketNumberIdGenerator();
        // Allocate all 65536 IDs
        for (let i = 0; i < 65536; i++) {
            gen.getPacketId();
        }
        expect(() => gen.getPacketId()).toThrow();
    });
});
