import { Abstract } from '@tsdi/ioc';
import { Observable } from 'rxjs';
import { Packet } from './packet';
import { Decoder } from './coding';


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
     * @param input 
     */
    abstract receive(input: any): void;

    abstract get packet(): Observable<Packet>;

}
