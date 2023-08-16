import { Inject, tokenId } from '@tsdi/ioc';
import { Packet } from '@tsdi/common';
import { SendPacket } from '../TransportSession';
import { AbstractDecoder, AbstractEncoder, Decoding, Encoding } from '../coding';


export const HEADER_ENCODINGS = tokenId<Encoding[]>('HEADER_ENCODINGS');
export const PAYLOAD_ENCODINGS = tokenId<Encoding[]>('PAYLOAD_ENCODINGS');


export class PacketEncoder extends AbstractEncoder {

    protected readonly encodings: Encoding<SendPacket>[];

    constructor(
        @Inject(HEADER_ENCODINGS) headerEncodings: Encoding[],
        @Inject(PAYLOAD_ENCODINGS) payloadEncodings: Encoding[]
    ) {
        super();

        this.encodings = [...headerEncodings, ...payloadEncodings];
    }

}


export const HEADER_DECODINGS = tokenId<Encoding[]>('HEADER_DECODINGS');
export const PAYLOAD_DECODINGS = tokenId<Encoding[]>('PAYLOAD_DECODINGS');


export class PacketDecoder extends AbstractDecoder {

    protected readonly decodings: Decoding<Packet>[];

    constructor(
        @Inject(HEADER_ENCODINGS) headerEncodings: Decoding[],
        @Inject(PAYLOAD_ENCODINGS) payloadEncodings: Decoding[]
    ) {
        super();
        this.decodings = [...headerEncodings, ...payloadEncodings];
    }
}
