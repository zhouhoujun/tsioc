import { PacketIdGenerator } from '@tsdi/common';
export declare class PacketNumberIdGenerator implements PacketIdGenerator {
    private allocator?;
    private last?;
    readonly idLenght = 2;
    getPacketId(): string | number;
    readId(raw: Buffer): string | number;
}
