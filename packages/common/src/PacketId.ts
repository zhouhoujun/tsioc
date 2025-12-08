import { Abstract, Injectable } from '@tsdi/ioc';
import { UuidGenerator } from '@tsdi/core';

@Abstract()
export abstract class PacketIdGenerator {
    abstract getPacketId(): string | number;
    abstract readId(raw: Buffer): string | number;
    abstract get idLenght(): number;
}


@Injectable()
export class PacketUUIdGenerator implements PacketIdGenerator {

    readonly idLenght = 36;
    constructor(private uuid: UuidGenerator) { }

    getPacketId(): string | number {
        return this.uuid.generate();
    }

    readId(raw: Buffer): string | number {
        return raw.subarray(0, this.idLenght).toString();
    }

}
