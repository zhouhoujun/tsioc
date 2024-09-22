import { BasePacket, PacketOpts } from '@tsdi/common';
import { IReadableStream } from './stream';

export interface SerializationOpts extends PacketOpts<string | Buffer | IReadableStream> {
    streamLength?: number;
}

/**
 * Serialization packet.
 */
export abstract class Serialization extends BasePacket<string | Buffer | IReadableStream> {
    streamLength?: number;
    noHead?: boolean;

    constructor(init: SerializationOpts) {
        super();
        this.streamLength = init.streamLength;
    }
}

export abstract class SerializationFactory {
    abstract create(options: SerializationOpts): Serialization;
}

/**
 * resful serialization packet.
 */
export abstract class UrlSerialization extends Serialization {
    constructor(readonly url: string, init: SerializationOpts) {
        super(init)
    }
}

/**
 * Topic serialization packet.
 */
export abstract class TopicSerialization extends Serialization {
    constructor(readonly topic: string, readonly responseTopic: string | undefined, init: SerializationOpts) {
        super(init)
    }
}

