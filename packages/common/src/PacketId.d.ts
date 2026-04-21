import { UuidGenerator } from '@tsdi/core';
export declare abstract class PacketIdGenerator {
    abstract getPacketId(): string | number;
    abstract readId(raw: Buffer): string | number;
    abstract get idLenght(): number;
}
export declare class PacketUUIdGenerator implements PacketIdGenerator {
    private uuid;
    readonly idLenght = 36;
    constructor(uuid: UuidGenerator);
    getPacketId(): string | number;
    readId(raw: Buffer): string | number;
}
