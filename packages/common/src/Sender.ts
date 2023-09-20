import { Abstract } from '@tsdi/ioc';
import { Observable } from 'rxjs';
import { Packet } from './packet';
import { Encoder } from './coding';




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
