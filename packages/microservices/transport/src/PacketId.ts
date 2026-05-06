import { Exception, Injectable } from '@tsdi/ioc';
import { PacketIdGenerator } from '@tsdi/common';
import { NumberAllocator } from 'number-allocator';


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
            throw new Exception('alloc stream id failed');
        }
        this.last = id;
        return id;
    }

    readId(raw: Buffer): string | number {
        return raw.readInt16BE(0);
    }

}
