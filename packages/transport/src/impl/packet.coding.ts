import { Inject, tokenId } from '@tsdi/ioc';
import { SendPacket } from '../TransportSession';
import { AbstractEncoder, Encoding } from '../coding';
import { Observable } from 'rxjs';


export const HEADER_ENCODINGS = tokenId<Encoding[]>('HEADER_ENCODINGS');
export const PAYLOAD_ENCODINGS = tokenId<Encoding[]>('PAYLOAD_ENCODINGS');



export class PacketEncoder extends AbstractEncoder {
    get packet(): Observable<Buffer> {
        throw new Error('Method not implemented.');
    }
    protected readonly encodings: Encoding<SendPacket, Buffer>[];

    constructor(
        @Inject(HEADER_ENCODINGS) headerEncodings: Encoding[],
        @Inject(PAYLOAD_ENCODINGS) payloadEncodings: Encoding[]
    ) {
        super();

        this.encodings = [...headerEncodings, ...payloadEncodings];
    }

}