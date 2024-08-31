import { BasePacket, CloneOpts, HeadersLike, Packet, PacketOpts } from '@tsdi/common';
import { IReadableStream } from './stream';

export interface SerializedPacketOpts extends PacketOpts<string | Buffer | IReadableStream> {
    streamLength?: number;
}

/**
 * Serialized packet.
 */
export abstract class SerializedPacket extends BasePacket<string | Buffer | IReadableStream> {
    streamLength?: number;
    noHead?: boolean;

    constructor(init: SerializedPacketOpts) {
        super();
        this.streamLength = init.streamLength;
    }
}

export abstract class UrlSerializedPacket extends SerializedPacket {

    constructor(readonly url: string, init: SerializedPacketOpts) {
        super(init)
    }

}

export abstract class TopicSerializedPacket extends SerializedPacket {

    constructor(readonly topic: string, readonly responseTopic: string | undefined, init: SerializedPacketOpts) {
        super(init)
    }
}

