import { Abstract } from '@tsdi/ioc';
import { Observable } from 'rxjs';
import { Buffer } from 'buffer';
import { Decoder } from './coding';
import { Transport } from './protocols';
import { IncomingPacket } from './socket';


/**
 * Packet receiver.
 */
@Abstract()
export abstract class Receiver<TSocket = any> {

    /**
     * socket
     */
    abstract get socket(): TSocket;

    /**
     * transport type
     */
    abstract get transport(): Transport;

    /**
     * decoder.
     */
    abstract get decoder(): Decoder;

    /**
     * receive message 
     * @param input 
     */
    abstract receive(message: string | Buffer | Uint8Array, topic?: string): Observable<IncomingPacket>;


}

export interface TopicBuffer {
    topic: string;
    buffers: Buffer[];
    length: number;
    contentLength: number | null;
}
