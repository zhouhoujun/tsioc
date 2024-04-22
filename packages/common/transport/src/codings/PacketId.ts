import { UuidGenerator } from '@tsdi/core';
import { Abstract, Execption, Injectable } from '@tsdi/ioc';
import { NumberAllocator } from 'number-allocator';

@Abstract()
export abstract class PacketIdGenerator {
    abstract getPacketId(): string | number;
    abstract readId(raw: Buffer): string | number;
    abstract get idLenght(): number;
}

@Injectable()
export class PacketNumberIdGenerator implements PacketIdGenerator {

    private allocator?: NumberAllocator;
    private last?: number;

    readonly idLenght = 2;

    getPacketId(): string | number {
        if (!this.allocator) {
            this.allocator = new NumberAllocator(1, 65536)
        }
        const id = this.allocator.alloc();
        if (!id) {
            throw new Execption('alloc stream id failed');
        }
        this.last = id;
        return id;
    }

    readId(raw: Buffer): string | number {
        return raw.readInt16BE(0);
    }


}

@Injectable()
export class PacketUUIdGenerator implements PacketIdGenerator {

    readonly idLenght = 36;
    constructor(private uuid: UuidGenerator) { }

    getPacketId(): string | number {
        return this.uuid.generate();
    }

    readId(raw: Buffer): string | number {
        return new TextDecoder().decode(raw.subarray(0, this.idLenght));
    }

}
