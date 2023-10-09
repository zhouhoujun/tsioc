import { Abstract } from '@tsdi/ioc';
import { Observable } from 'rxjs';
import { Buffer } from 'buffer';
import { ResponsePacket } from './packet';
import { Decoder } from './coding';
import { Transport } from './protocols';


/**
 * Packet receiver.
 */
@Abstract()
export abstract class Receiver {

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
    abstract receive(message: string | Buffer | Uint8Array, topic?: string): Observable<ResponsePacket>;


}
