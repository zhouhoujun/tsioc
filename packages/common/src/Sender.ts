import { Abstract } from '@tsdi/ioc';
import { Observable } from 'rxjs';
import { Packet } from './packet';
import { Encoder } from './coding';
import { Transport } from './protocols';




/**
 * Packet sender.
 */
@Abstract()
export abstract class Sender<TSocket = any> {

    /**
     * socket
     */
    abstract get socket(): TSocket;

    /**
     * transport type
     */
    abstract get transport(): Transport;
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
