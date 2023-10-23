import { Abstract, InvokeArguments } from '@tsdi/ioc';
import { Observable } from 'rxjs';
import { Packet } from './packet';
import { Context, Encoder } from './coding';




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
     * @param factory  context factory
     * @param packet 
     */
    abstract send(factory: (pkg: Packet, headDelimiter?: Buffer, options?: InvokeArguments) => Context, packet: Packet): Observable<any>;

}
