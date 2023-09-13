import { Abstract } from '@tsdi/ioc';
import { Packet } from '@tsdi/common';
import { Observable } from 'rxjs';
import { Encoder } from './Encoder';




/**
 * Packet sender.
 */
@Abstract()
export abstract class Sender {
    /**
     * encoder.
     */
    abstract get encoder(): Encoder;

    /**
     * send packet
     * @param packet 
     */
    abstract send(packet: Packet): Observable<any>;
 
}
