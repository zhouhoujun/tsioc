import { Abstract } from '@tsdi/ioc';
import { Decoder } from './Decoder';
import { Observable } from 'rxjs';
import { Packet } from './packet';


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
