import { Abstract, InvokeArguments } from '@tsdi/ioc';
import { Observable } from 'rxjs';
import { Buffer } from 'buffer';
import { Context, Decoder } from './coding';
import { IncomingPacket } from './socket';


/**
 * Packet receiver.
 */
@Abstract()
export abstract class Receiver {

    /**
     * decoder.
     */
    abstract get decoder(): Decoder;

    /**
     * receive message 
     * @param contextFactory context factory 
     * @param message message buffer.
     * @param topic message topic.
     */
    abstract receive(factory: (msg: string | Buffer | Uint8Array, headDelimiter?: Buffer, options?: InvokeArguments) => Context, message: string | Buffer | Uint8Array, topic?: string): Observable<IncomingPacket>;


}

export interface TopicBuffer {
    topic: string;
    buffers: Buffer[];
    length: number;
    contentLength: number | null;
}
